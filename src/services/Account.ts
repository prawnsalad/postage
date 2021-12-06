import type { ILabel } from '@/types/common';
import ApiService from './Api';

interface IUser {
    name: string,
    primaryAccount: string
}

interface IAccount {
    account: string,
    send: boolean,
    receive: boolean
}

export default class Account {
    api: ApiService;
    user: IUser;
    accounts: Array<IAccount>;

    constructor(api: ApiService) {
        this.api = api;
        this.user = {
            name: 'Darren Whitlen',
            primaryAccount: 'user@email.com',
        };

        this.accounts = [
            { account: 'user@email.com', send: true, receive: true, },
            { account: 'user@work.org', send: true, receive: true, },
        ];
    }

    async getLabels(): Promise<Array<ILabel>> {
        let [err, labels] = await this.api.call('labels.get');
        return labels;
    }
}
