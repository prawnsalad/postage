export default class Account {
    async getLabels() {
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
