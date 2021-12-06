const { ErrorForClient } = require('./types');

/*
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

const apiv1 = {
    misc: {
        sleep: async () => {
            await sleep(2000);
        },
    },
    account: {
        login: async (accountName, password) => {
            if (accountName === 'darren@domain.com' && password === '1234') {
                return {accountname};
            } else {
                throw new ErrorForClient('Invalid login', 'bad_auth');
            }
        },
        logout: async () => {
            return true;
        },
        update: async (accountProps) => {},
    },
    labels: {
        get: async () => {
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
                { id: 7, name: 'Label 70', custom: true },
            ];
        },
        add: async (labelName) => {
            return {id: 4, name: labelName};
        },
        delete: async(labelId) => {
            return true;
        },
    },
    messages: {
        latest: async (labelIds) => {
            let msgs = messages.filter(m => {
                for (mLabelId of m.labels) {
                    if (labelIds.includes(mLabelId)) {
                        return true;
                    }
                }
            });

            msgs = msgs.map(m => ({
                ...m,
                // bodyText should just be a preview of the body contents. Displayed in the messagelist
                bodyText: '[preview] ' + m.bodyHtml.substr(0, 100),
                bodyHtml: '',
            }));

            return msgs;
        },
        search: async (labelIds, size) => {},
        get: async (messageIds) => {
            return messages.filter(m => messageIds.includes(m.id));
        },
        thread(threadId) {
            let msgs = messages.filter(m => {
                return m.threadId === threadId;
            });

            return {
                id: threadId,
                messages: msgs,
            };
        }
    },
};

module.exports = {
    v1: apiv1,
};







function sleep(len) {
    return new Promise(r => setTimeout(r, len));
}



const numThreads = 50;
const labels = [1,2,3,4,5,6,7];
const messages = [];
for (let i=0; i<100; i++) {
    messages.push({
        id: String(i),
        threadId: (i % numThreads).toString(), // thread IDs can just be the first message ID in the thread (can we
                        // determine a thread id on message ingestion or should it be determined
                        // in the UI with the messags it has?)
        from: 'someone@gmail.com',
        to: ['you@domain.com'],
        cc: [],
        bcc: [],
        subject: 'RE: RE: FW: help pls',
        bodyText: 'wooo my body ' + i,
        bodyHtml: 'wooo my <b>body</b> ' + i,
        labels: [
            labels[Math.floor(Math.random()*labels.length)],
        ],
        recieved: new Date(),
    });
}
