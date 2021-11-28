import type { ILabel } from '@/types/common';

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
    user: IUser;
    accounts: Array<IAccount>

    constructor() {
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
        // Backend notes:
        // - ids are per-user
        // - ids are attached to messages
        // - labels dont get deleted, only marked as deleted. because emails with
        //   the label ID will still be there.
        return [
            { id: 1, name: 'Inbox', custom: false },
            { id: 2, name: 'Drafts', custom: false },
            { id: 3, name: 'Sent', custom: false },
            { id: 4, name: 'Spam', custom: false },
            { id: 5, name: 'Deleted', custom: false },
            { id: 6, name: 'Custom Label', custom: true },
            { id: 7, name: 'Label 69', custom: true },
        ];
    }
}
