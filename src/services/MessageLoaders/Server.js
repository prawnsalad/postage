export default class MessageLoaderServer {
    constructor(opts={}) {
        this.opts = opts;
    }

    async init() {
        return this;
    }

    async getRecords(ids=[]) {
        let resp = null;
        let inbox = null;
        try {
            resp = await fetch('http://localhost:8081/serverinbox.json'); // get all messages IDs at once
            inbox = await resp.json();
        } catch (err) {
            console.error('Error loading messages from server', err);
            return [];
        }

        let records = ids.map(async id => {
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

        return (await Promise.allSettled(records)).map(p => p.value);
    }
}
