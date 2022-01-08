const { ImapFlow } = require('imapflow');
const { MongoClient } = require('mongodb');
const _ = require('lodash');
const mailparser = require('mailparser');

let dbClient;
let db;
let dbUsersCol;
let dbMessagesCol;

(async function() {
    dbClient = new MongoClient(global.config.database?.connection || '');
    await dbClient.connect();
    db = dbClient.db('postage');
    dbUsersCol = db.collection('users');
    dbMessagesCol = db.collection('messages');

    let dbUsers = await dbUsersCol.find({}).toArray();
    for(let user of dbUsers) {
        for(let source of user.sources) {
            console.log(`Starting imap source (${user.name}): ${source.host}`);
            let imp = new ImapImporter(user, source);
            imp.start().catch(err => console.error(err));
        }
    }
})();

class ImapImporter {
    constructor(user, source) {
        this.user = user;
        this.source = source;

        this.client = new ImapFlow({
            host: source.host,
            port: source.port,
            secure: source.tls,
            auth: {
                user: source.auth_user,
                pass: source.auth_pass,
            },
            logger: {
                debug: noop,
                info: noop,
                warn: console.log,
                error: console.log,
            },
        });
    }

    async start() {
        // Good reference for the logic used here
        // https://stackoverflow.com/questions/1084780/getting-only-new-mail-from-an-imap-server

        const client = this.client;

        // Wait until client connects and authorizes
        await client.connect();
        // let list = await client.list();
        // console.log(list)
        // list.forEach(mailbox=>console.log(mailbox.path));
        // return;

        // Select and lock a mailbox. Throws if mailbox does not exist
        let lock = await client.getMailboxLock('[Gmail]/All Mail');

        let inboxStatus = await client.status('[Gmail]/All Mail', {messages: true});
        console.log('inboxStatus:', inboxStatus);

        try {
            let batch = [];
            let saveBatch = async () => {
                console.log('Saving batch of 500..');
                console.time('saveBatch');
                let b = batch;
                batch = [];
                await this.saveBatch(b);
                console.timeEnd('saveBatch');
            }
            // fetch latest message source
            // client.mailbox includes information about currently selected mailbox
            // "exists" value is also the largest sequence number available in the mailbox
            //let message = await client.fetchOne(client.mailbox.exists, { source: true });
            //console.log('message.source', message.source.toString());

            // If we're continuing from a uid, ignore the first message as it's the last one we already have
            let ignoreMessage = false;
            if (this.source.imapUid) {
                ignoreMessage = true;
            }
            for await (let message of client.fetch(`${this.source.imapUid || 1}:*`, { envelope: false, source: true }, {uid:true})) {
                // console.log(`MESSAGE ${message.uid} / ${inboxStatus.messages}`);
                //console.log(message.envelope)
                //console.log(message.source.toString())

                if (ignoreMessage) {
                    ignoreMessage = false;
                    continue;
                }

                batch.push({
                    sourceId: this.source._id,
                    imapUid: message.uid,
                    raw: message.source,
                });

                if (batch.length >= 500) {
                    await saveBatch();
                }
            }

            if (batch.length > 0) {
                await saveBatch();
            }
        } finally {
            // Make sure lock is released, otherwise next `getMailboxLock()` never returns
            try {
                lock.release();
            } catch (err) {
                // ignore
            }
        }

        console.log('All messages iterated');

        // log out and close connection
        try {
            await client.logout();
        } catch (err) {
            // ignore
        }

        // Mark this source injestion as finished
        await dbUsersCol.updateOne(
            {
                _id: this.user._id,
                sources: { $elemMatch: {_id: this.source._id } }
            },
            {
                $set: {
                    'sources.$.ingestPing': 0,
                }
            }
        );
    }

    async saveBatch(batch) {
        let lookupThreadIdsForTheseMsgIds = [];
        let entries = batch.map(async entry => {
            let parsed = await mailparser.simpleParser(entry.raw);
            if (parsed.messageId) {
                lookupThreadIdsForTheseMsgIds.push(parsed.messageId);
            }
            if (parsed.inReplyTo) {
                lookupThreadIdsForTheseMsgIds.push(parsed.inReplyTo);
            }
            if (parsed.references?.length > 0) {
                lookupThreadIdsForTheseMsgIds = lookupThreadIdsForTheseMsgIds.concat(parsed.references);
            }

            // https://nodemailer.com/extras/mailparser/#mail-object
            let ret = {
                _id: generateId(),
                messageId: parsed.messageId || '',
                threadId: '',
                subject: parsed.subject,
                // https://nodemailer.com/extras/mailparser/#address-object
                from: (parsed?.from?.value || []),
                to: (parsed?.to?.value || []),
                cc: (parsed?.cc?.value || []),
                bcc: (parsed?.bcc?.value || []),
                bodyText: parsed.text || '',
                bodyHtml: parsed.html || '',
                labels: ['1a2dh2pn9ebql5o2'], // 'inbox' label id
                recieved: parsed.date ? parsed.date.getTime() : Date.now(),
                read: 0,
                inReplyTo: parsed.inReplyTo || '',
                references: toArray(parsed.references),
                attachments: parsed.attachments.map(file => {
                    return {
                        filename: file.filename,
                        type: file.contentType,
                        cid: file.cid,
                        size: file.size,
                    };

                    // TODO: store file.content somewhere. S3 bucket? probably.
                }),
                // TODO: Add an entry.source with any attachment contents removed so its not bloated up
                source: '',
                sourceId: entry.sourceId,
                imapUid: entry.imapUid,
            };

            return ret;
        });

        function toArray(inp) {
            if (Array.isArray(inp)) {
                return inp;
            }

            return inp === undefined || inp === null ?
                [] :
                [inp];
        }

        // Wait for each batch entry to complete processing
        await Promise.allSettled(entries);

        let lastMessage = null;
        //  messageIdToThreadIds - maps messageIds to its threadIds for looking up inreplyTo/references/etc
        let messageIdToThreadIds = await this.getThreadIds(_.uniq(lookupThreadIdsForTheseMsgIds));
        let newThreadIds = Object.create(null); // {messageId: message}
        let addMsgToThreadMap = Object.create(null); // {threadId: [msgId, msgId2], ...}

        function addMsgToThread(entry) {
            if (!addMsgToThreadMap[entry.threadId]) {
                addMsgToThreadMap[entry.threadId] = [];
            }
            addMsgToThreadMap[entry.threadId].push(entry);
            messageIdToThreadIds[entry.messageId] = entry.threadId;
        }

        messageloop:
        for await (let entry of entries) {
            let setThreadId = threadId => {
                entry.threadId = threadId;
            };

            lastMessage = entry;

            // If this message references any other message that we have a thread for, add it to
            // that existing thread
            if (messageIdToThreadIds[entry.messageId]) {
                setThreadId(messageIdToThreadIds[entry.messageId]);
                addMsgToThread(entry);
                console.log(entry.messageId, 'step 1')
                continue messageloop;
            }

            if (messageIdToThreadIds[entry.inReplyTo]) {
                setThreadId(messageIdToThreadIds[entry.inReplyTo]);
                addMsgToThread(entry);
                console.log(entry.messageId, 'step 2')
                continue messageloop;
            }

            for (let ref of (entry.references || [])) {
                if (messageIdToThreadIds[ref]) {
                    setThreadId(messageIdToThreadIds[ref]);
                    addMsgToThread(entry);
                    console.log(entry.messageId, 'step 3')
                    continue messageloop;
                }
            }

            // We may have just created a new thread ID that this message references
            if (newThreadIds[entry.messageId]) {
                setThreadId(newThreadIds[entry.messageId].threadId);
                addMsgToThread(entry);
                console.log(entry.messageId, 'step 4')
                continue messageloop;
            }  
            if (newThreadIds[entry.inReplyTo]) {
                setThreadId(newThreadIds[entry.inReplyTo].threadId);
                addMsgToThread(entry);
                console.log(entry.messageId, 'step 5')
                continue messageloop;
            }
            if (entry.references?.length > 0) console.log(entry.references)
            for (let ref of (entry.references || [])) {
                console.log(entry.messageId, ref, 'step 6.0')
                if (newThreadIds[ref]) {
                    setThreadId(newThreadIds[ref].threadId);
                    addMsgToThread(entry);
                    console.log(entry.messageId, 'step 6.1')
                    continue messageloop;
                }
            }

            // This message doesn't reference any other message that we know of, so create a new
            // thread
            setThreadId(generateId());
            newThreadIds[entry.messageId] = entry;
            console.log(entry.messageId, 'step 7')
        }

        // 1 - Insert any new threads into the db
        if (Object.keys(newThreadIds).length) {
            let newThreadsMap = Object.create(null);
            for (let msgId in newThreadIds) {
                let msg = newThreadIds[msgId]; 
                newThreadsMap[msg.threadId] = newThreadsMap[msg.threadId] || {
                    _id: msg.threadId,
                    accountId: this.user._id,
                    sourceId: this.source._id,
                    lastRecieved: 0,
                    messages: [],
                };

                newThreadsMap[msg.threadId].messages.push(msg);
            }

            let threads = Object.values(newThreadsMap);
            threads.forEach(t => t.lastRecieved = _.chain(t.messages).sortBy('recieved').last().value().recieved);
            await dbMessagesCol.insertMany(threads);
        }

        // 2 - Add messages to existing threads
        // TODO: Can this update be done in a single updateMany() call? its different values per
        // document so I couldn't find a way
        for (let threadId in addMsgToThreadMap) {
            let msgs = addMsgToThreadMap[threadId];
            let lastRec = _.chain(msgs).sortBy('recieved').last().value().recieved
            await dbMessagesCol.updateOne(
                {_id: threadId},
                {
                    $addToSet: { messages: {$each: msgs} },
                    $set: { lastRecieved: lastRec },
                }
            );
        }

        // Updates to this source object in the db
        let sourceUpdate = {};

        // 3 - Record the last message we had so we can continue from this point in future if needed
        //     (ie. the process restarts and we need to continue getting messages from this point)
        if (lastMessage) {
            sourceUpdate['sources.$.imapUid'] = lastMessage.imapUid;
        }

        await dbUsersCol.updateOne(
            {
                _id: this.user._id,
                sources: { $elemMatch: {_id: this.source._id } }
            },
            {
                $set: {
                    ...sourceUpdate,
                    'sources.$.ingestPing': Date.now(),
                }
            }
        );
    }

    async getThreadIds(messageIds=[]) {
        let messageIdMap = Object.create(null);
        let threads = await dbMessagesCol.find(
            {
                'sourceId': this.source._id,
                'messages.messageId': { $in: messageIds }
            },
            {fields:{'_id':1, 'messages.messageId':1}}
        ).toArray();
        for (let thread of threads) {
            // console.log('THREAD:', thread._id, thread.messages.map(m=>m.messageId))
            for (let msg of thread.messages) {
                messageIdMap[msg.messageId] = thread._id;
            }
        }

        // {messageId: threadId, message2: threadId}
        return messageIdMap;
    }
}

function noop(){}

function generateId() {
    // TODO: use uuidv6
    return Math.floor(Math.random() * 1000000000000).toString(36) + Math.floor(Math.random() * 1000000000000).toString(36);
}