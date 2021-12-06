/*

> POST /api/1/
['namespace.method', arg1, arg2]
['namesoace2.method', arg1, arg2]

< HTTP 200
{error: null, value: {}}
{error: null, value: null}
*/

export default class TransportHttp {
    url: string;

    constructor(opts: {[key: string]:any}) {
        this.url = opts.url;
    }

    async call(methodName, ...args) {
        let payload = JSON.stringify([methodName, ...args]);
        let resp: Response;
        try {
            resp = await fetch(this.url, {
                method: 'POST',
                headers: {
                    Accept: 'application/json'
                },
                body: payload,
            });
        } catch (err) {
            throw err;
        }

        let rawResponse = await resp.text();
        let responses = rawResponse.split('\n');
        let returns:[object|null, any][] = [];
        for (let r of responses) {
            if (!r) continue;
            try {
                let tmp = JSON.parse(r);
                returns.push(tmp);
            } catch (err) {
                console.error('[labels] error parsing API result');
            }
        }
        
        if (returns.length !== 1) {
            throw new Error('API server error: API returned incorrect number of values');
        }

        return returns;
    }
}
