import * as idb from 'idb';
import type { IMessage } from '@/types/common';

interface MessageLoaderIndexdbOptions {
    dbname: string
}

export default class MessageLoaderIndexdb {
    opts: MessageLoaderIndexdbOptions
    db: idb.IDBPDatabase<unknown> | null

    constructor(opts: object) {
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
        if (!this.db) {
            throw new Error('Could not add test messages as db is not set');
        }

        let labels = [1,2,3,4,5,6,7];
        let messages: Array<IMessage> = [];
        for (let i=0; i<100; i++) {
            messages.push(
                {
                    id: String(i),
                    threadId: i.toString(), // thread IDs can just be the first message ID in the thread (can we
                                 // determine a thread id on message ingestion or should it be determined
                                 // in the UI with the messags it has?)
                    from: 'someone@gmail.com',
                    to: ['you@domain.com'],
                    cc: [],
                    bcc: [],
                    subject: 'RE: RE: FW: help pls',
                    body: 'wooo my body ' + i,
                    labels: [
                        labels[Math.floor(Math.random()*labels.length)],
                    ],
                }
            );
        }
        const tx = this.db.transaction('messages', 'readwrite');
        await Promise.all(messages.map(m => tx.store.add(m)));
        await tx.done;
    }

    async getRecords(ids: Array<string>=[]) {
        if (!this.db) {
            throw new Error('Could not get records as db is not set');
        }

        let waitingRecords: Array<any> = ids.map(async id => {
            let record = {
                id,
                loaded: false,
                src: {},
            }

            let val = await this.db!.get('messages', id);
            if (val !== undefined) {
                Object.assign(record.src, val);
                record.loaded = true;
            }

            return record;
        });

        let settled = await Promise.allSettled(waitingRecords);
        let records: Array<object> = [];
        for (let record of settled) {
            if (record.status === 'fulfilled') {
                records.push(record.value);
            }
        }

        return records;
    }
}
