import * as idb from 'idb';
import { IObjectSource } from '@/libs/ObjectHydration';
import type { IMessage } from '@/types/common';

interface MessageLoaderIndexdbOptions {
    dbname: string
}

export default class MessageLoaderIndexdb implements IObjectSource {
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

    async getLatest(labelIds: number[]) {
        return [];
    }

    async getThread(threadId: string) {
        return [];
    }

    async getRecords(ids: string[]=[]): Promise<any> {
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
