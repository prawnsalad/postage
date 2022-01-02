const { MongoClient } = require('mongodb');
const _ = require('lodash');
const { ErrorForClient } = require('./types');


const dbClient = new MongoClient('mongodb://root:1234@localhost:27017');
let dbUsersCol;
let dbMessagessCol;

(async function() {
    await dbClient.connect();
    const db = dbClient.db('postage');
    dbUsersCol = db.collection('users'); // {name, password, sources: [{}]}
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

function parseQuery(queryStr) {
    return {};
}

const apiv1 = {
    misc: {
        sleep: async (apiCtx) => {
            await sleep(2000);
        },
    },
    account: {
        login: async (apiCtx, accountName, password) => {
            let user = await dbUsersCol.findOne({name: accountName, password: password}).toArray();
            if (user) {
                return {accountname: user.name};
            } else {
                throw new ErrorForClient('Invalid login', 'bad_auth');
            }
        },
        logout: async (apiCtx) => {
            return true;
        },
        update: async (apiCtx, accountProps) => {},
    },
    labels: {
        get: async (apiCtx) => {
            let doc = await dbUsersCol.findOne(
                {_id: apiCtx.user.id},
                { projection: { labels: 1 } },
            );

            let labels = [];
            for (let label of (doc?.labels || [])) {
                if (!label.name) continue;
                labels.push({
                    id: label._id,
                    name: label.name,
                    filter: label.filter.raw,
                    unread: label.unread,
                });
            }

            return labels;
        },
        update: async (apiCtx, labelId, values={}) => {
            let toUpdate = {};
            if (values.name) {
                toUpdate['labels.$.name'] = values.name.trim();
            }
            if (values.filter) {
                toUpdate['labels.$.filter.raw'] = values.filter.trim();
                toUpdate['labels.$.filter.parsed'] = parseQuery(values.filter.trim());
            }

            await dbUsersCol.updateOne(
                {
                    _id: apiCtx.user.id,
                    labels: { $elemMatch: {_id: labelId } }
                },
                {$set: toUpdate}
            );
        },
        add: async (apiCtx, labelName, values={}) => {
            // values = same as in update()
            let query = values.filter || '';
            let parsedQuery = parseQuery(query);

            let newId = generateId();

            await dbUsersCol.updateOne(
                {_id: apiCtx.user.id},
                {
                    $addToSet: {
                        labels: {
                            _id: newId,
                            name: labelName,
                            unread: 0,
                            filter: { raw: query, parsed: parsedQuery }
                        },
                    },
                }
            );
            return {id: newId, name: labelName};
        },
        delete: async(apiCtx, labelId) => {
            await dbUsersCol.updateOne(
                {
                    _id: apiCtx.user.id,
                    labels: { $elemMatch: {_id: labelId } }
                },
                {$set: {[`labels.$.name`]: ''}}
            );
        },
    },
    messages: {
        // TODO: should be "system" user only
        ingest: async (apiCtx, incoming) => {
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
        latest: async (apiCtx, labelIds, size=100) => {
            let filter = {};
            if (labelIds?.length) {
                filter['messages.labels'] = { $in: labelIds || [] };
            }

            console.time('dbLatestThreadIds')
            let dbLatestThreadIds = await dbMessagessCol.aggregate([
                {
                    $match: {
                        accountId: apiCtx.user.id,
                        ...filter
                    },
                },
                // {
                //     $project: {
                //         recieved: { $max: "$messages.recieved"},
                //     },
                // },
                // {
                //     $sort: { recieved: -1 },
                // },
                {
                    $sort: { lastRecieved: -1 },
                },
                {
                    $limit: size,
                },
            ]).toArray();
            //console.log(JSON.stringify(dbLatestThreadIds, null, 2))
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
                let newThread = {messages: [], id: t._id, subject: '', lastRecieved: 0 };
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

                    if (m.recieved > newThread.lastRecieved) {
                        newThread.lastRecieved = m.recieved;
                    }
                }
            }

            return _.orderBy(latestThreads, ['lastRecieved'], ['desc']);

        },
        search: async (apiCtx, labelIds, size) => {},
        get: async (apiCtx, messageIds, opts={}) => {
            return messages.filter(m => messageIds.includes(m.id));
        },
        async thread(apiCtx, threadId) {
            console.time('dbSingleThread')
            let dbThread = await dbMessagessCol.findOne({
                accountId: apiCtx.user.id,
                _id: threadId
            });
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

function generateId() {
    // TODO: use uuidv6
    return Math.floor(Math.random() * 1000000000000).toString(36) + Math.floor(Math.random() * 1000000000000).toString(36);
}