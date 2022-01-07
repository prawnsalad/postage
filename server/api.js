const { MongoClient } = require('mongodb');
const _ = require('lodash');
const { ErrorForClient } = require('./types');
const { parseQuery } = require('./TextQueryParser');



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



// The only values that are allowed to be updated, and their types
const sourceTypes = {
    imap: {
        type: { type: 'string', name: 'type' },
        name: { type: 'string', name: 'name' },
        host: { type: 'string', name: 'host' },
        port: { type: 'number', name: 'port' },
        tls: { type: 'boolean', name: 'tls' },
        authUser: { type: 'string', name: 'auth_user' },
        authPass: { type: 'string', name: 'auth_pass' },
    },
};
function parseClientSourceValues(values, fieldValues) {
    // TODO: Move this validation to a validation lib
    let toUpdate = {};
    for (let prop in values) {
        let field = fieldValues[prop];
        if (!field) {
            continue;
        }

        let val = values[prop];

        if (
            field.type === 'string' && typeof val !== 'string' ||
            field.type === 'number' && typeof val !== 'number' ||
            field.type === 'boolean' && typeof val !== 'boolean'
        ) {
            throw new ErrorForClient(`Invalid type for property '${prop}'`, 'invalid_type');
        }

        toUpdate[field.name] = val;
    }

    return toUpdate;
}


const apiv1 = {
    misc: {
        sleep: async (apiCtx) => {
            await sleep(2000);
        },
    },
    account: {
        me: async (apiCtx) => {
            if (!apiCtx.session.uid) {
                return {};
            }

            let user = await dbUsersCol.findOne({_id: apiCtx.session.uid});
            if (!user) {
                return {};
            }

            return {
                name: user.name,
                primaryAccount: user.name, // TODO: this should get the main account
            };
        },
        login: async (apiCtx, accountName, password) => {
            let user = await dbUsersCol.findOne({name: accountName, password: password});
            if (user) {
                apiCtx.session.uid = user._id;
                return {
                    name: user.name,
                    primaryAccount: user.name, // TODO: this should get the main account
                };
            } else {
                throw new ErrorForClient('Invalid login', 'bad_auth');
            }
        },
        logout: async (apiCtx) => {
            delete apiCtx.session.uid;
            return true;
        },
        update: async (apiCtx, accountProps) => {},
    },
    source: {
        async get(apiCtx) {
            let dbSources = await dbUsersCol.findOne(
                {_id: apiCtx.session.uid},
                { projection: { sources: 1 } },
            );

            let sources = [];
            for (let source of (dbSources?.sources || [])) {
                sources.push({
                    id: source._id,
                    name: source.name,
                    ingestPing: source.ingestPing,
                    type: source.type,
                    host: source.host,
                    port: source.port,
                    tls: !!source.tls,
                    authUser: source.auth_user,
                    authPass: source.auth_pass,
                });
            }

            return sources;
        },

        async update (apiCtx, sourceId, values={}) {
            let fieldValues = sourceTypes[values.type];
            if (!fieldValues) {
                throw new ErrorForClient('Unknown type of message source', 'unknown_source_type');
            }

            let toUpdate = parseClientSourceValues(values, fieldValues);
            // Prepend the db doc field to each property
            for (let prop in toUpdate) {
                toUpdate['sources.$.' + prop] = toUpdate[prop];
                delete toUpdate[prop];
            }

            if (Object.keys(toUpdate).length > 0) {
                await dbUsersCol.updateOne(
                    {
                        _id: apiCtx.session.uid,
                        sources: { $elemMatch: {_id: sourceId } }
                    },
                    {$set: toUpdate}
                );
            }
        },

        async add(apiCtx, name, values) {
            if (!name.trim) {
                throw new ErrorForClient('Missing name for the new source', 'missing_params');
            }

            let fieldValues = sourceTypes[values.type];
            if (!fieldValues) {
                throw new ErrorForClient('Unknown type of message source', 'unknown_source_type');
            }

            let newSource = parseClientSourceValues(values, fieldValues);
            if (Object.keys(newSource).length === 0) {
                throw new ErrorForClient('Missing name for the new source', 'missing_params');
            }

            let newId = generateId();
            newSource._id = newId;
            newSource.name = name.trim();
            newSource.imapUid = '';

            await dbUsersCol.updateOne(
                {
                    _id: apiCtx.session.uid
                },
                {$push: { sources: newSource } }
            );

            return { id: newId };
        },

        async delete(apiCtx, sourceId) {
            await dbUsersCol.updateOne(
                {
                    _id: apiCtx.session.uid,
                },
                {
                    $pull: {
                        sources: { _id: sourceId }
                    }
                }
            );
        },
    },
    labels: {
        get: async (apiCtx) => {
            let doc = await dbUsersCol.findOne(
                {_id: apiCtx.session.uid},
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
                    _id: apiCtx.session.uid,
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
                {_id: apiCtx.session.uid},
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
                    _id: apiCtx.session.uid,
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
                        accountId: apiCtx.session.uid,
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
                        from: m.from.map(i => formatAddress(i)).join(', '),
                        to: m.to.map(i => formatAddress(i)),
                        cc: m.cc.map(i => formatAddress(i)),
                        bcc: m.bcc.map(i => formatAddress(i)),
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
        search: async (apiCtx, rawQuery='', size=100) => {
            let searchTerm = '';
            let query = parseQuery(rawQuery, {
                groupWords: [],
                defaultGroupWord: 'and',
            });
            let labels = [];
            let dbFilter = {};

            // Only lookup our labels if we need them
            if (query[0].tags.find(t => t.tag === 'label')) {
                let acc = await dbUsersCol.findOne({_id: apiCtx.session.uid});
                labels = acc.labels;
            }

            // Build up the mongodb text search query. Will end up looking
            // like: "apple" "delivery" -Quora
            // Misc things like has:attachment or label:inbox gets built into the dbFilter object
            for (let tag of query[0].tags) {
                if (tag.tag === 'term' && tag.exclude) {
                    searchTerm += `-"${tag.value}" `;
                }
                if (tag.tag === 'term' && !tag.exclude) {
                    searchTerm += `"${tag.value}" `;
                }
                if (tag.tag === 'has' && tag.value === 'attachment') {
                    dbFilter['messages.attachments.0'] = { $exists: true};
                }
                if (tag.tag === 'to' && !tag.exclude) {
                    if (!dbFilter['messages.to.address']) {
                        dbFilter['messages.to.address'] = { $in: [] };
                    }
                    dbFilter['messages.to.address']['$in'].push(tag.value);
                }
                if (tag.tag === 'from' && !tag.exclude) {
                    if (!dbFilter['messages.from.address']) {
                        dbFilter['messages.from.address'] = { $in: [] };
                    }
                    dbFilter['messages.from.address']['$in'].push(tag.value);
                }
                if (tag.tag === 'cc' && !tag.exclude) {
                    if (!dbFilter['messages.cc.address']) {
                        dbFilter['messages.cc.address'] = { $in: [] };
                    }
                    dbFilter['messages.cc.address']['$in'].push(tag.value);
                }
                if (tag.tag === 'bcc' && !tag.exclude) {
                    if (!dbFilter['messages.bcc.address']) {
                        dbFilter['messages.bcc.address'] = { $in: [] };
                    }
                    dbFilter['messages.bcc.address']['$in'].push(tag.value);
                }
                if (tag.tag === 'label') {
                    let label = labels.find(l => l.name.toLowerCase() === tag.value.toLowerCase());
                    if (!label) {
                        console.log('couldnt find requested label', tag.value);
                        // Searching for an non-existing label would return no results so no
                        // need to even run the query. Return an empty resultset
                        return [];
                    }

                    if (!dbFilter['messages.labels']) {
                        dbFilter['messages.labels'] = { $in: [] };
                    }
                    dbFilter['messages.labels']['$in'].push(label._id);
                }
            }

            if (searchTerm) {
                dbFilter['$text'] = { $search: searchTerm };
            }

            console.time('dbSearchThreadIds')
            let dbLatestThreadIds = await dbMessagessCol.aggregate([
                {
                    $match: {
                        accountId: apiCtx.session.uid,
                        ...dbFilter,
                    },
                },
                {
                    $project: {
                        lastRecieved: 1,
                    },
                },
                {
                    $sort: { lastRecieved: -1 },
                },
                {
                    $limit: size,
                },
            ]).toArray();

            console.timeEnd('dbSearchThreadIds')

            console.time('dbSearchThreads')
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
            ]).toArray();
            console.timeEnd('dbSearchThreads')

            let foundThreads = [];
            for (let t of dbThreads) {
                let newThread = {messages: [], id: t._id, subject: '', lastRecieved: 0 };
                foundThreads.push(newThread);

                for (let m of t.messages) {
                    newThread.subject = m.subject;
                    newThread.messages.push({
                        id: m.messageId,
                        threadId: t._id,
                        from: m.from.map(i => formatAddress(i)).join(', '),
                        to: m.to.map(i => formatAddress(i)),
                        cc: m.cc.map(i => formatAddress(i)),
                        bcc: m.bcc.map(i => formatAddress(i)),
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

            return _.orderBy(foundThreads, ['lastRecieved'], ['desc']);

        },
        get: async (apiCtx, messageIds, opts={}) => {
            return messages.filter(m => messageIds.includes(m.id));
        },
        async thread(apiCtx, threadId) {
            console.time('dbSingleThread')
            let dbThread = await dbMessagessCol.findOne({
                accountId: apiCtx.session.uid,
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
                    from: m.from.map(i => formatAddress(i)).join(', '),
                    to: m.to.map(i => formatAddress(i)),
                    cc: m.cc.map(i => formatAddress(i)),
                    bcc: m.bcc.map(i => formatAddress(i)),
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

// Create "Name <address@example.net>" formatted string
function formatAddress(obj) {
    let parts = [];
    if (obj.name) parts.push(obj.name);
    if (obj.address) parts.push('<' + obj.address + '>');
    return parts.join(' ');
}
