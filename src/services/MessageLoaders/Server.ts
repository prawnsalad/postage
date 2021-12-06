
import { IObjectSource } from '@/libs/ObjectHydration';
import AppInstance from '../AppInstance';

export default class MessageLoaderServer implements IObjectSource{
    opts: object

    constructor(opts: object={}) {
        this.opts = opts;
    }

    async init() {
        return this;
    }

    async getLatest(labelIds: number[]) {
        let [err, messages] = await AppInstance.instance().api.call('messages.latest', labelIds);
        return messages;
    }

    async getThread(threadId: string) {
        let [err, thread] = await AppInstance.instance().api.call('messages.thread', threadId);
        return thread.messages;
    }

    async getRecords(ids: string[]=[]): Promise<any> {
        let inbox: any;

        try {
            [, inbox] = await AppInstance.instance().api.call('messages.get', ids);
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
