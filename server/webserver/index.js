const readline = require('readline');
const stream = require('stream');

const Koa = require('koa');
const koaRouter = require('koa-router');
const jwt = require('jsonwebtoken');
const parseDuration = require('parse-duration');
const { getHttpBodyStream }  = require('./requestStream');
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
    let jwtSecret = global.config?.cookies?.jwtsecret || 'secret';
    let cookieName = global.config?.cookies?.name || 'tok';
    let cookieMaxAge = parseDuration(global.config?.cookies?.maxage || '4w');
    let cookieSecure = global.config?.cookies?.requirehttps || false;
    
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

        ctx.cookies.set(cookieName, newTok, {
            secure: cookieSecure,
            maxAge: cookieMaxAge,
        });
    }
});

const router = new koaRouter();
router.get('/', async ctx => {
    ctx.body = '';
});

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
app.listen(config?.webserver?.bind_port || 8010, config?.webserver?.bind_address);

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

async function runApiCall(apiCtx, apiMethods, methodName, ...args) {
    // Extract 'app' and 'app.login' from 'app.login'
    let namespaceName = methodName.substr(0, methodName.lastIndexOf('.'));
    let fnName = methodName.substr(methodName.lastIndexOf('.') + 1);

    // Make sure this is a function directly on an object with a _meta property, so prototype
    // functions can't be called by smart users
    let namespace = getProp(apiMethods, namespaceName);
    if (
        !namespace ||
        !namespace._meta ||
        !namespace.hasOwnProperty(fnName) ||
        typeof namespace[fnName] !== 'function'
    ) {
        throw new ErrorForClient('Method not found', 'method_not_found');
    }

    // Run any functions before this API method. It may throw an error to send back to the client
    if (Array.isArray(namespace._meta.runBefore)) {
        for (let beforeFn of namespace._meta.runBefore) {
            await beforeFn(apiCtx, namespace, fnName);
        }
    }

    let func = namespace[fnName];
    return func(apiCtx, ...args);
}
