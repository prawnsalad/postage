import type { IMessage, IMessageSourceLoader } from '@/types/common';
import makeDeferred from '@/libs/Deferred'
import AppInstance from '../AppInstance';

export default class MessageLoaderServer {
    opts: object

    constructor(opts: object={}) {
        this.opts = opts;
    }

    async init() {
        return this;
    }

    async searchMessages(ctx: IMessageSourceLoader, query: string) {
        let [err, threads] = await AppInstance.instance().api.call('messages.search', query);
        for (let thread of threads) {
            for (let m of thread.messages) {
                let message = {
                    id: m.id,
                    threadId: m.threadId,
                    from: m.from,
                    to: m.to,
                    cc: m.cc,
                    bcc: m.bcc,
                    subject: thread.subject,
                    bodyText: '',
                    bodyHtml: '',
                    snippet: m.snippet,
                    labels: m.labels,
                    recieved: m.recieved,
                    read: m.read,
                };

                ctx.messages.push(message);
                ctx.messageMap[m.id] = message;
            }
        }
    }

    async getLatest(ctx: IMessageSourceLoader, labelIds: number[]) {
        let [err, threads] = await AppInstance.instance().api.call('messages.latest', labelIds);
        for (let thread of threads) {
            for (let m of thread.messages) {
                let message = {
                    id: m.id,
                    threadId: m.threadId,
                    from: m.from,
                    to: m.to,
                    cc: m.cc,
                    bcc: m.bcc,
                    subject: thread.subject,
                    bodyText: '',
                    bodyHtml: '',
                    snippet: m.snippet,
                    labels: m.labels,
                    recieved: m.recieved,
                    read: m.read,
                };

                ctx.messages.push(message);
                ctx.messageMap[m.id] = message;
            }
        }
    }

    async getThread(ctx: IMessageSourceLoader, threadId: string) {
        let [err, thread] = await AppInstance.instance().api.call('messages.thread', threadId);
        for (let m of thread.messages) {
            let message = {
                id: m.id,
                threadId: m.threadId,
                from: m.from,
                to: m.to,
                cc: m.cc,
                bcc: m.bcc,
                subject: m.subject,
                bodyText: m.bodyText,
                bodyHtml: m.bodyHtml,
                snippet: m.snippet,
                labels: m.labels,
                recieved: m.recieved,
                read: m.read,
            };

            ctx.messages.push(message);
            ctx.messageMap[m.id] = message;
        }
    }
}
