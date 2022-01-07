const readline = require('readline');
const stream = require('stream');
const { fork } = require('child_process');

const Koa = require('koa');
const koaRouter = require('koa-router');
const jwt = require('jsonwebtoken');
const { getHttpBodyStream } = require('./requestStream');
const api = require('./api');
const { ErrorForClient } = require('./types');
 
const app = new Koa();
app.use((ctx, next) => {
    console.log(ctx.url)
    return next();
});

// Load the session from a JWT cookie and write it back to the client after the route
// has completed
app.use(async (ctx, next) => {
    let jwtSecret = 'secret';
    let cookieName = 'tok';
    
    let cookie = ctx.cookies.get(cookieName);

    if (cookie) {
        try {
            let jwtTok = jwt.verify(cookie, jwtSecret);
            ctx.state.session = {
                ...jwtTok,
            };
        } catch (err) {
            // noop. invalid token
        }
    }

    if (!ctx.state.session) {
        ctx.state.session = {};
    }

    await next();

    if (typeof ctx.state.session === 'object') {
        let newTok = jwt.sign({
            ...ctx.state.session,
        }, jwtSecret);

        let daySec = 1 * 60 * 60 * 24;
        ctx.cookies.set(cookieName, newTok, {
            // secure: true,
            maxAge: daySec * 30 * 1000,
        });
    }
});

const router = new koaRouter();
router.post('/api/1/', async ctx => {
    const rl = readline.createInterface({
        input: getHttpBodyStream(ctx.req),
        crlfDelay: Infinity
    });

    ctx.body = stream.PassThrough();
    let apiCtx = {
        session: ctx.state.session,
    };
    await processInput(apiCtx, api.v1, rl, ctx.body);
});

app.use(router.routes());
app.use(router.allowedMethods());
app.listen(4000);

// runMessageImporter();

function getProp(obj, key) {
    let ret = obj || {};
    for(let prop of key.split('.')) {
        ret = ret[prop];
        if (ret === undefined) break;
    }
    return ret;
}


async function processInput(apiCtx, api, streamIn, streamOut) {
    for await (const line of streamIn) {
        let ret = '';

        try {
            // ['namespace.method', arg1, arg2]
            let call = JSON.parse(line);
            if (!Array.isArray(call)) {
                throw new ErrorForClient('Invalid API call', 'invalid_api_call');
            }

            let methodName = call[0] || '';
            let methodArgs = call.slice(1);

            if (typeof methodName !== 'string' || !methodName.trim()) {
                throw new ErrorForClient('Invalid method name', 'invalid_api_call');
            }

            let response = await runApiCall(apiCtx, api, methodName.trim(), ...methodArgs);
            ret += JSON.stringify([null, response]) + '\n';
        } catch (err) {
            if (err instanceof ErrorForClient) {
                ret += JSON.stringify([{code: err.code, message: err.message}, null]) + '\n';
            } else {
                console.log(err);
                ret += JSON.stringify([{code: 'unknown_eror', message: 'An internal error occured'}, null]) + '\n';
            }
        }

        streamOut.write(ret);
    }

    streamOut.end();
}

function runApiCall(apiCtx, apiMethods, methodName, ...args) {
    let func = getProp(apiMethods, methodName);
    if (typeof func !== 'function') {
        throw new ErrorForClient('Method not found', 'method_not_found');
    }

    return func(apiCtx, ...args);
}

function runMessageImporter() {
    let child = fork(__dirname + '/imapimport/index.mjs');
    child.on('close', () => {
        setTimeout(runMessageImporter, 1000);
    })
}
