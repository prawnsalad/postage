import Account from '@/services/Account';
import Contacts from '@/services/Contacts';
import ApiService from '@/services/Api';

interface AppInstanceConfig {
    apiUrl: string,
}

let instance: AppInstance;

export default class AppInstance {
    api: ApiService;
    account: Account;
    contacts: Contacts;

    constructor(opts: AppInstanceConfig) {
        this.api = new ApiService({
            url: opts.apiUrl,
        });

        this.account = new Account(this.api);
        this.contacts = new Contacts(this.api);

        instance = this;
    }

    static instance(): AppInstance {
        return instance;
    }
}
