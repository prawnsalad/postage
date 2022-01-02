const readline = require('readline');
const stream = require('stream');

const Koa = require('koa');
const koaRouter = require('koa-router');
const { getHttpBodyStream } = require('./requestStream');
const api = require('./api');
const { ErrorForClient } = require('./types');
 
const app = new Koa();
app.use((ctx, next) => {
    console.log(ctx.url)
    return next();
});

app.use((ctx, next) => {
    ctx.state.user = {
        id: 1,
    };
    return next();
});

const router = new koaRouter();
router.post('/api/1/', async ctx => {
    const rl = readline.createInterface({
        input: getHttpBodyStream(ctx.req),
        crlfDelay: Infinity
    });

    ctx.body = stream.PassThrough();
    processInput(api.v1, rl, ctx.body);
});

app.use(router.routes());
app.use(router.allowedMethods());
app.listen(4000);

function getProp(obj, key) {
    let ret = obj || {};
    for(let prop of key.split('.')) {
        ret = ret[prop];
        if (ret === undefined) break;
    }
    return ret;
}


async function processInput(api, streamIn, streamOut) {
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

            let response = await runApiCall(api, methodName.trim(), ...methodArgs);
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

function runApiCall(apiMethods, methodName, ...args) {
    let func = getProp(apiMethods, methodName);
    if (typeof func !== 'function') {
        throw new ErrorForClient('Method not found', 'method_not_found');
    }

    return func(...args);
}
