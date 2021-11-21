import * as idb from 'idb';

export default class MessageLoaderIndexdb {
    constructor(opts={}) {
        this.opts = Object.assign({
            dbname: 'mailapp',
        }, opts);

        this.db = null;
    }

    async init() {
        // Examples https://github.com/jakearchibald/idb#article-store
        this.db = await idb.openDB(this.opts.dbname, 1, {
            upgrade(db) {
                // Create a store of objects
                const store = db.createObjectStore('messages', {
                    keyPath: 'id',
                    autoIncrement: false,
                });
                // Create an index on the 'date' property of the objects.
                // store.createIndex('date', 'date');
            },
        });

        return this;
    }

    async addTestmessages() {
        let labels = [1,2,3,4,5,6,7];
        let messages = [];
        for (let i=0; i<100; i++) {
            messages.push(
                {
                    id: i,
                    threadId: i, // thread IDs can just be the first message ID in the thread (can we
                                 // determine a thread id on message ingestion or should it be determined
                                 // in the UI with the messags it has?)
                    fromEmail: 'someone@gmail.com',
                    fromName: 'Some name',
                    to: 'you@domain.com',
                    topic: 'RE: RE: FW: help pls',
                    labels: [
                        labels[Math.floor(Math.random()*labels.length)],
                    ],
                }
            );
        }
        const tx = this.db.transaction('messages', 'readwrite');
        await Promise.all(messages.map(m => tx.store.add(m)));
        await tc.done;
    }

    async getRecords(ids=[]) {
        let records = ids.map(async id => {
            let record = {
                id,
                loaded: false,
                src: {},
            }

            let val = await this.db.get('messages', id);
            if (val !== undefined) {
                Object.assign(record.src, val);
                record.loaded = true;
            }

            return record;
        });

        return (await Promise.allSettled(records)).map(p => p.value);
    }
}
