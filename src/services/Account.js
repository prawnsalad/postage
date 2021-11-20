export default class Account {
    async getLabels() {
        return[
            { name: 'Inbox', custom: false },
            { name: 'Drafts', custom: false },
            { name: 'Sent', custom: false },
            { name: 'Spam', custom: false },
            { name: 'Deleted', custom: false },
            { name: 'Custom Label', custom: true },
            { name: 'Label 69', custom: true },
        ];
    }
}
