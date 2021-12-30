const { ErrorForClient } = require('./types');
const { MongoClient } = require('mongodb');


const dbClient = new MongoClient('mongodb://root:1234@localhost:27017');
let dbAccountsCol;
let dbMessagessCol;

(async function() {
    await dbClient.connect();
    const db = dbClient.db('postage');
    dbAccountsCol = db.collection('accounts');
    dbMessagessCol = db.collection('messages');
})();

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
        // TODO: should be "system" user only
        ingest: async (incoming) => {
            // TODO: validate the incoming message before inserting
            let message = {
                id: incoming.id,
                threadId: incoming.threadId || '',
                from: incoming.from, // 'some name <some@gmail.com>'
                to: incoming.to, //['you@domain.com'],
                cc: incoming.cc, //['you@domain.com'],
                bcc: incoming.bcc, //['you@domain.com'],
                subject: incoming.subject, //'RE: RE: FW: help pls',
                bodyText: incoming.bodyText, //'wooo my body ' + i,
                bodyHtml: incoming.bodyHtml, //'wooo my <b>body</b> ' + i,
                labels: [
                    1,
                ],
                recieved: incoming.recieved ? incoming.recieved : Date.now(),
                read: incoming.read ? incoming.read : 0,
                inReplyTo: incoming.inReplyTo || '',
                raw: incoming.raw || '',
            };
            insertMessage(message);

        },
        // Get the latest threads, and all messages within each thread. size=the number of threads
        latest: async (labelIds, size=100) => {
            let filter = {};
            if (labelIds?.length) {
                filter['messages.labels'] = { $in: labelIds || [] };
            }

            console.time('dbLatestThreadIds')
            let dbLatestThreadIds = await dbMessagessCol.aggregate([
                {
                    $match: {
                        // accountId: 'aw57t06ajx2x9qt',
                        ...filter
                    },
                },
                {
                    $project: {
                        recieved: { $max: "$messages.recieved"},
                    },
                },
                {
                    $sort: { recieved: -1 },
                },
                {
                    $limit: size,
                },
            ]).toArray();
            console.timeEnd('dbLatestThreadIds')

            console.time('dbThreads')
            let dbThreads = await dbMessagessCol.aggregate([
                {
                    $match: {
                        _id: { $in: dbLatestThreadIds.map(i => i._id) },
                    },
                },
                {
                    $project: {
                        'messages.messageId': 1,
                        'messages.subject': 1,
                        'messages.from': 1,
                        'messages.to': 1,
                        'messages.cc': 1,
                        'messages.bcc': 1,
                        'messages.bodyText': 1,
                        'messages.labels': 1,
                        'messages.recieved': 1,
                        'messages.read': 1,
                        'messages.inReplyTo': 1,
                        'messages.references': 1,
                        'messages.attachments': 1,
                    },
                },
                // {
                //     $addFields: {
                //         'messages.bodyText': { $substrCP: ['$messages.bodyText', 0, 100] }
                //     },
                // },
            ]).toArray();
            console.timeEnd('dbThreads')

            let latestThreads = [];
            for (let t of dbThreads) {
                let newThread = {messages: [], id: t._id, subject: '' };
                latestThreads.push(newThread);

                for (let m of t.messages) {
                    newThread.subject = m.subject;
                    newThread.messages.push({
                        id: m.messageId,
                        threadId: t._id,
                        from: m.from.map(i => `${i.name} ${i.address}`).join(''),
                        to: m.to.map(i => `${i.name} ${i.address}`),
                        cc: m.cc.map(i => `${i.name} ${i.address}`),
                        bcc: m.bcc.map(i => `${i.name} ${i.address}`),
                        labels: m.labels,
                        recieved: m.recieved,
                        read: m.read,
                        snippet: m.bodyText.trim().substr(0, 100).trim(),
                    });
                }
            }

            return latestThreads;

        },
        search: async (labelIds, size) => {},
        get: async (messageIds, opts={}) => {
            return messages.filter(m => messageIds.includes(m.id));
        },
        async thread(threadId) {
            console.time('dbSingleThread')
            let dbThread = await dbMessagessCol.findOne({_id: threadId});
            console.timeEnd('dbSingleThread')
            if (!dbThread) {
                throw new ErrorForClient('Thread not found', 'not_found');
            }

            let msgs = [];
            for (let m of dbThread.messages) {
                msgs.push({
                    id: m.messageId,
                    threadId: m.threadId || '',
                    from: m.from.map(i => `${i.name} ${i.address}`).join(''),
                    to: m.to.map(i => `${i.name} ${i.address}`),
                    cc: m.cc.map(i => `${i.name} ${i.address}`),
                    bcc: m.bcc.map(i => `${i.name} ${i.address}`),
                    subject: m.subject, //'RE: RE: FW: help pls',
                    bodyText: m.bodyText, //'wooo my body ' + i,
                    bodyHtml: m.bodyHtml, //'wooo my <b>body</b> ' + i,
                    labels: m.labels,
                    recieved: m.recieved ? m.recieved : Date.now(),
                    read: m.read ? m.read : 0,
                    inReplyTo: m.inReplyTo || '',
                });
            }

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
