import Account from '@/services/Account';
import Contacts from '@/services/Contacts';
import ApiService from '@/services/Api';
import Policy from '@/services/Policies';

interface AppInstanceConfig {
    apiUrl: string,
}

let instance: AppInstance;

export default class AppInstance {
    appPolicy: Policy;
    api: ApiService;
    account: Account;
    contacts: Contacts;

    constructor(opts: AppInstanceConfig) {
        this.api = new ApiService({
            url: opts.apiUrl,
        });

        this.appPolicy = new Policy();
        this.account = new Account(this.api);
        this.contacts = new Contacts(this.api);

        instance = this;
    }

    static instance(): AppInstance {
        return instance;
    }

    async checkStatus() {
        let [, status] = await this.api.call('app.status');
        if (status.policy) {
            this.appPolicy.setPolicies([status.policy]);
        }

        this.account.checkExistingAuthFromAppStatus(status);
    }

    policy(key: string, def?: any): any {
        return this.appPolicy.get(key, def);
    }
}
