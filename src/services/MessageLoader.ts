import { loadObjectsWithIds } from '@/libs/ObjectHydration';
import loaderIndexdb from './MessageLoaders/Indexdb';
import loaderServer from './MessageLoaders/Server';
import type { IMessageLoader } from '@/types/common';

interface IMessageCollectionLoader {
    promises: Promise<any>[],
    collection: Array<IMessageLoader>
}

const l1 = new loaderIndexdb({dbname: 'mailapp'});
await l1.init();

const l2 = new loaderServer({});
await l2.init();

const loaders = [
    l1,
    l2,
];

export function getMessages(ids): IMessageCollectionLoader {
    return loadObjectsWithIds(ids, loaders);
}

export function getLatestMessages(opts={}) {

}

/*
get latest messages from a label (inbox, sent, etc) or several labels
search labels
*/