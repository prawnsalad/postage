/*
API design:

account.login(accountName, password) > {error: null, account: IAccount}
account.logout() > {error: null}
account.update(accountProps) > {error: null, account: IAccount}
labels.get() > {error: null, labels: ILabel[]}
labels.add(labelName) > {error: null, label:ILabel}
labels.delete(labelName) > {error: null}
messages.latest(labelIds[], size) > {error: null, IMessage[]}
messages.search(labelIds[], query) > {error: null, IMessage[]}
messages.get(messageIds[]) > {error: null, IMessage[]}

*/

import TransportHttp from './TransportHttp';

export default class ApiService {
    transport: TransportHttp;

    constructor(opts: {[key: string]: any}) {
        this.transport = new TransportHttp(opts);
    }

    async call(methodName, ...args) {
        console.log('[API call]', methodName, args);
        let responses;
        try {
            responses = await this.transport.call(methodName, ...args);
        } catch (err) {
            console.error('API error:', err);
            throw new Error('API server error');
        }

        let response = responses[0];
        return [response[0], response[1]];
    }
}
