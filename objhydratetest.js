let TypeMessage = {
    name: '',
    topic: '',
    threadid: '',
    body: '',  
};

let TypeStoreMessage = {
    cache: {
        id: '',
        updated: '',
    },
    src: TypeMessage,
}


class TestRecordDatabase {
    constructor(records, opts={}) {
        this.records = records;
        this.opts = opts;
    }

    getRecord(id) {
        let records = this.getRecords([id]);
        return records[0];

    }
    getRecords(ids=[]) {
        let recordCollection = {
            promises: [],
            records: [],
        };

        recordCollection.records = ids.map(id => {
            let record = {
                loaded: false,
                promise: null,
                src: {
                    id,
                    name: '',
                    topic: '',
                    threadid: '',
                    body: '',  
                },
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
};

// Create a promise with the resolve/reject functions tacked on
function makePromise() {
    let resolve = null;
    let reject = null;
    let p = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    p.resolve = resolve;
    p.reject = reject;
    return p;
}

function getMessageIds(ids, sources=[]) {
    let promises = [];
    let collectionMap = Object.create(null); // id:<record in collection> for faster lookup
    let collection = [];

    // Build our record collection
    ids.forEach(id => {
        let record = collectionMap[id] = {
            id,
            promise: makePromise(),
            loading: true,
            state: 'loading', // loading/loaded/failed
            src: {},
        };

        promises.push(record.promise);
        collection.push(record);
    });

    // To get our collection back to the caller as soon as possible, run the actual data
    // loading in the next tick
    setTimeout(async () => {
        let outstandingRecordIds = [...ids];
        for (let source of sources) {
            let recordsFromSource = source.getRecords(outstandingRecordIds);
            await Promise.allSettled(recordsFromSource.promises);

            outstandingRecordIds = [];
            recordsFromSource.records.forEach(r => {
                if (r.loaded) {
                    collectionMap[r.src.id].src = r.src;
                    collectionMap[r.src.id].state = 'loaded';
                    collectionMap[r.src.id].promise.resolve();
                } else {
                    outstandingRecordIds.push(r.src.id);
                }
            });
        }

        // Any remaining unloaded records have failed
        collection.forEach(r => {
            if (r.state === 'loading') {
                collectionMap[r.id].state = 'failed';
                collectionMap[r.id].promise.reject();
            }
        });
    }, 0)

    return {
        collection,
        promises,
    };
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
        msg2: {
            id: 'msg2',
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









setTimeout(() => {
    console.log(1)
}, 60000)