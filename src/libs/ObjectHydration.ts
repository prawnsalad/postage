import { IMessage } from '@/types/common';
import makeDeferred from './Deferred';

export interface IObjectSource {
    getRecords(ids: Array<string>): Promise<any>
}

interface IRecordState {
    id: string,
    state: 'loading' | 'loaded' | 'failed',
    src: object,
}

export function loadObjectsWithIds(ids: string[], sources: IObjectSource[]=[]) {
    let collectionMap: {[key: string]: IRecordState} = Object.create(null);
    let collection: any = [];

    let sourcePromises = sources.map(() => makeDeferred());
    sourcePromises.push(makeDeferred()); // add a final one for when everything has completed

    // Build our record collection
    ids.forEach(id => {
        let record = collectionMap[id] = {
            id,
            state: 'loading', // loading/loaded/failed
            src: {},
        };

        collection.push(record);
    });

    // To get our collection back to the caller as soon as possible, run the actual data
    // loading in the next tick
    setTimeout(async () => {
        let outstandingRecordIds = [...ids];
        for (let i=0; i<sources.length; i++) {
            let source = sources[i];

            let recordsFromSource;
            try {
                recordsFromSource = await source.getRecords(outstandingRecordIds);
            } catch (err) {
                console.error('Error hydrating objects from source', err);
                recordsFromSource = [];
            }

            outstandingRecordIds = [];
            recordsFromSource.forEach(r => {
                if (r.loaded) {
                    collectionMap[r.id].src = r.src;
                    collectionMap[r.id].state = 'loaded';
                } else {
                    outstandingRecordIds.push(r.id);
                }
            });

            // Let the consumer know that this source has completed
            sourcePromises[i].resolve();
        }

        // Any remaining unloaded records have failed
        collection.forEach(r => {
            if (r.state === 'loading') {
                collectionMap[r.id].state = 'failed';
            }
        });

        // Complete the final promises now that we've finished everything
        sourcePromises[sourcePromises.length-1].resolve();
    }, 0);

    return {
        collection,
        promises: sourcePromises,
    };
}

/**
 * Example usage
 *
 *

class TestRecordDatabase {
    constructor(records, opts={}) {
        this.records = records;
        this.opts = opts;
    }

    getRecords(ids=[]) {
        let recordCollection = {
            promises: [],
            records: [],
        };

        recordCollection.records = ids.map(id => {
            let record = {
                id,
                loaded: false,
                promise: null,
                src: {},
            }

            record.promise = new Promise((resolve, reject) => {
                if (this.records[id]) {
                    setTimeout(() => {
                        // TODO: get the record from local caches here
                        record.src = this.records[id]

                        record.loaded = true;
                        resolve(this.records[id]);
                    }, this.opts.delay ? 5000 : 0);
                } else {
                    reject();
                }
            });

            recordCollection.promises.push(record.promise);
            return record;
        });

        return recordCollection;
    }
}

(async () => {
    let internalDb = new TestRecordDatabase({
        msg1: {
            id: 'msg1',
            name: 'Darren',
            topic: 'bla bla',
            threadid: 'aaaa-bbbb',
            body: 'hi! go sum update?',
        },
    });
    let externalDb = new TestRecordDatabase({
        msg3: {
            id: 'msg3',
            name: 'Phil',
            topic: 'foo',
            threadid: 'aaaa-cccc',
            body: 'no update',
        },
    }, {delay:true});

    let records = getMessageIds(['msg1', 'msg2'], [internalDb, externalDb]);
    await records.collection[0].promise;
    console.log('before', records.collection);
    await Promise.allSettled(records.promises);
    console.log('after', records.collection)
})();


*/
