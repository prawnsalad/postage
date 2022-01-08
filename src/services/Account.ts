import type { ILabel } from '@/types/common';
import ApiService from './Api';
import Policies from './Policies';

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
    policies: Policies;

    constructor(api: ApiService) {
        this.api = api;
        this.user = {
            name: '',
            primaryAccount: '',
        };

        this.accounts = [
            { account: 'user@email.com', send: true, receive: true, },
            { account: 'user@work.org', send: true, receive: true, },
        ];

        this.policies = new Policies();
    }

    async checkExistingAuthFromAppStatus(status: any) {
        if (!status.user?.primaryAccount) {
            return false;
        }

        this.user.name = status.user.name;
        this.user.primaryAccount = status.user.primaryAccount;
        if (status.user.policies) {
            this.policies.setPolicies(status.user.policies);
        }

        return true;
    }

    async login(username: string, password: string): Promise<boolean> {
        let [authErr, ret] = await this.api.call('app.login', username, password);
        if (authErr?.code === 'bad_auth') {
            return false;
        }
        if (authErr) {
            throw new Error(authErr.message)
        }

        this.user.name = ret.name;
        this.user.primaryAccount = ret.primaryAccount;

        if (ret.policies) {
            this.policies.setPolicies(ret.policies);
        }

        return true;
    }

    async logout() {
        await this.api.call('account.logout');
        this.user.name = '';
        this.user.primaryAccount = '';
    }

    isLoggedIn() {
        return !!this.user.primaryAccount;
    }

    async getLabels(): Promise<Array<ILabel>> {
        let [err, labels] = await this.api.call('labels.get');
        return labels;
    }

    policy(key: string, def?: any): any {
        return this.policies.get(key, def);
    }
}
