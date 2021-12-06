import { loadObjectsWithIds, IObjectSource } from '@/libs/ObjectHydration';
import loaderIndexdb from './MessageLoaders/Indexdb';
import loaderServer from './MessageLoaders/Server';
import type { IMessage, IMessageLoader } from '@/types/common';

interface IMessageCollectionLoader {
    promises: Promise<any>[],
    collection: Array<IMessageLoader>
}

const l1 = new loaderIndexdb({dbname: 'mailapp'});
await l1.init();

const l2 = new loaderServer({});
await l2.init();

const loaders = [
    l1 as IObjectSource,
    l2 as IObjectSource,
];

export function getMessages(ids: string[]): IMessageCollectionLoader {
    return loadObjectsWithIds(ids, loaders);
}

interface IMessageFilters {
    labelsIds?: number[],
    dateTo?: Date,
    dateFrom?: Date,

}
export async function getLatest(filters: IMessageFilters={}): Promise<IMessageCollectionLoader> {
    let messages: IMessage[] = await l2.getLatest(filters.labelsIds || []);
    return {
        promises: [Promise.resolve()],
        collection: messages.map(m => ({
            id: m.id,
            src: m,
            state: 'loaded',
        })),
    };
}
export async function getThread(threadId: string): Promise<IMessageCollectionLoader> {
    let messages: IMessage[] = await l2.getThread(threadId);
    return {
        promises: [Promise.resolve()],
        collection: messages.map(m => ({
            id: m.id,
            src: m,
            state: 'loaded',
        })),
    };
}

/*
get meta data:
 - get latest messages from a label (inbox, sent, etc) or several labels
 - search within labels

get full message (including body)
 - from a group of IDs

*/