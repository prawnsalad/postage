import * as idb from 'idb';
import type { IMessage, IMessageSourceLoader } from '@/types/common';

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

    async getLatest(ctx: IMessageSourceLoader, labelIds: number[]) {
        // noop. We don't get any latest messages from the local db (yet)
    }

    async getThread(ctx: IMessageSourceLoader, threadId: string) {

    }
}
