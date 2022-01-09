const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const _ = require('lodash');
const { ErrorForClient } = require('./types');
const { parseQuery } = require('./TextQueryParser');
const models = require('./dbModels');


let dbClient;
let db;
let dbUsersCol;
let dbMessagessCol;

(async function() {
    dbClient = new MongoClient(global.config.database?.connection || '');
    try {
        await dbClient.connect();
    } catch (err) {
        console.error('Error connecting to the database:', err.message);
        process.exit(1);
    }

    console.log('Connected to database')
    db = dbClient.db();
    dbUsersCol = db.collection('users');
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

const POLICY_DEFAULT = {
    sources: {
        show: true,
        modify: true,
        max: 0,
        types: ['imap'],
    },
    labels: {
        modify: true,
        max: 0,
    },
    messages: {
        send: true,
        attach: true,
    },
};

const APP_POLICY = {
    registration: {
        enabled: true,
    }
};


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
function parseClientSourceValuesToDbValues(values, fieldValues) {
    // TODO: Move this validation to a validation lib
    let toUpdate = {};
    for (let prop in fieldValues) {
        let field = fieldValues[prop];
        let userVal =  values[prop];

        if (userVal === undefined && field.required) {
            throw new ErrorForClient(`Missing required property '${prop}'`, 'missing_property');
        }

        if (
            field.type === 'string' && typeof userVal !== 'string' ||
            field.type === 'number' && typeof userVal !== 'number' ||
            field.type === 'boolean' && typeof userVal !== 'boolean'
        ) {
            throw new ErrorForClient(`Invalid type for property '${prop}'`, 'invalid_type');
        }

        toUpdate[field.name] = userVal;
    }

    return toUpdate;
}


async function requireAuth(apiCtx, namespace, methodName) {
    if (apiCtx.session.uid) {
        let user = await dbUsersCol.findOne({_id: apiCtx.session.uid});
        if (user) {
            apiCtx.user = {
                id: apiCtx.session.uid,
                name: user.name,
                primaryAccount: user.name, // TODO: this should get the main account
            };
        }

        return;
    }

    throw new ErrorForClient('needs_auth', 'You must be logged in to call this method');
}


const apiv1 = {
    app: {
        _meta: {},
        status: async (apiCtx) => {
            let ret = {
                user: null,
                policy: APP_POLICY,
            };

            if (apiCtx.session.uid) {
                let user = await dbUsersCol.findOne({_id: apiCtx.session.uid});
                if (user) {
                    ret.user = {
                        name: user.name,
                        primaryAccount: user.name, // TODO: this should get the main account
                        policies: [
                            // last policy entry wins
                            POLICY_DEFAULT,
                            { }, // group policy
                            user.policies || {},
                        ],
                    };
                }
            }

            return ret;
        },
        login: async (apiCtx, accountName, password) => {
            let user = await dbUsersCol.findOne({name: accountName});
            if (user) {
                if (!bcrypt.compareSync(password, user.password)) {
                    throw new ErrorForClient('Invalid login', 'bad_auth');
                }

                apiCtx.session.uid = user._id;
                return {
                    name: user.name,
                    primaryAccount: user.name, // TODO: this should get the main account
                    policies: [
                        // last policy entry wins
                        POLICY_DEFAULT,
                        { }, // group policy
                        user.policies || {},
                    ],
                };
            } else {
                throw new ErrorForClient('Invalid login', 'bad_auth');
            }
        },
        async register(apiCtx, userInfo) {
            let existingUser = await dbUsersCol.findOne({name: userInfo.name});
            if (existingUser) {
                throw new ErrorForClient('Username is unavailable', 'username_unavailable');
            }

            let newVals = parseClientSourceValuesToDbValues(userInfo, {
                name: { type: 'string', name: 'name', required: true },
                password: { type: 'string', name: 'password', required: true },
            });

            let newUser = models.User({
                _id: generateId(),
                ...newVals,
                password: bcrypt.hashSync(newVals.password),
            });
            await dbUsersCol.insertOne(newUser);

            return {
                id: newUser._id,
                name: newUser.name,
            };
        },
    },
    account: {
        _meta: {
            runBefore: [requireAuth],
        },
        logout: async (apiCtx) => {
            delete apiCtx.session.uid;
            return true;
        },
        update: async (apiCtx, accountProps) => {},
    },
    source: {
        _meta: {
            runBefore: [requireAuth],
        },
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

            let toUpdate = parseClientSourceValuesToDbValues(values, fieldValues);
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

            let newVals = parseClientSourceValuesToDbValues(values, fieldValues);
            if (Object.keys(newVals).length === 0) {
                throw new ErrorForClient('Missing parameters for the new source', 'missing_params');
            }

            let newSource = models.UserSource({
                _id: generateId(),
                name: name.trim(),
                ...newVals,
            });

            await dbUsersCol.updateOne(
                {
                    _id: apiCtx.session.uid
                },
                {$push: { sources: newSource } }
            );

            return { id: newSource._id };
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
        _meta: {
            runBefore: [requireAuth],
        },
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

            let newLabel = models.UserLabel({
                _id: generateId(),
                name: labelName,
                unread: 0,
                filter: { raw: query, parsed: parsedQuery }
            });

            await dbUsersCol.updateOne(
                {_id: apiCtx.session.uid},
                {
                    $addToSet: {
                        labels: newLabel,
                    },
                }
            );
            return {id: newLabel._id, name: labelName};
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
        _meta: {
            runBefore: [requireAuth],
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
