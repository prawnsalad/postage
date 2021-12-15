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
        // Get the latest threads, and all messages within each thread. size=the number of threads
        latest: async (labelIds, size=100) => {
            function areLabelsRequested(labelMap) {
                for (labelId of labelIds) {
                    if (labelMap[labelId]) return true;
                }

                return false;
            }

            // Get the threads that have the most recent messages
            let latestThreadsMap = Object.create(null);
            let latestThreads = [];
            for (let t of threads) {
                if (areLabelsRequested(t.labels)) {
                    let newThread = {messages: [], id: t.id, subject: '' };
                    latestThreads.push(newThread);
                    latestThreadsMap[t.id] = newThread;
                }
                if (latestThreads.length >= size) break;
            }

            let msgs = messages.filter(msg => !!latestThreadsMap[msg.threadId]);
            // Only include fields that are useful for a messagelist
            for (let m of msgs) {
                latestThreadsMap[m.threadId].subject = m.subject;
                latestThreadsMap[m.threadId].messages.push({
                    id: m.id,
                    threadId: m.threadId,
                    from: m.from,
                    to: m.to,
                    cc: m.cc,
                    bcc: m.bcc,
                    labels: m.labels,
                    recieved: m.recieved,
                    read: m.read,
                    snippet: m.bodyText.substr(0, 100),
                });
            }

            return latestThreads;
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



const numThreads = 5;
const labels = [1,2,3,4,5,6,7];
const messages = [];
const threads = [];
const dateEpoch = Date.now();
for (let i=0; i<100; i++) {
    let threadId = 't' + (i % numThreads).toString();
    if (!threads.includes(threadId)) {
        threads.push({id: threadId, messages: [], labels: {}});
    }

    let message = {
        id: String(i),
        threadId,
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
        recieved: new Date(dateEpoch + (i*(10*60*1000))),
        read: Math.random() * 10 > 5 ? Date.now() : 0,
    };
    messages.push(message);

    let t = threads.find(t=>t.id===threadId);
    t.messages.push(message.id);
    message.labels.forEach(l => t.labels[l] = true);
}
