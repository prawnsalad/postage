export default class MessageLoaderServer {
    opts: object

    constructor(opts: object={}) {
        this.opts = opts;
    }

    async init() {
        return this;
    }

    async getRecords(ids=[]) {
        let resp: Response;
        let inbox: any;

        try {
            resp = await fetch('http://localhost:8081/serverinbox.json'); // get all messages IDs at once
            inbox = await resp.json();
        } catch (err) {
            console.error('Error loading messages from server', err);
            return [];
        }

        let waitingRecords = ids.map(async id => {
            let record = {
                id,
                loaded: false,
                src: {},
            }

            let val = inbox.find(m => m.id === id);
            if (val) {
                Object.assign(record.src, val);
                record.loaded = true;
            } else {
                console.log('couldnt find message', id)
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
