import { loadObjectsWithIds } from '@/libs/ObjectHydration';
import loaderIndexdb from './MessageLoaders/Indexdb';
import loaderServer from './MessageLoaders/Server';

const l1 = new loaderIndexdb({dbname: 'mailapp'});
await l1.init();

const l2 = new loaderServer({});
await l2.init();

const loaders = [
    l1,
    l2,
];
console.log('loaders', loaders)

export function getMessages(ids) {
    return loadObjectsWithIds(ids, loaders);
}

export function getLatestMessages() {

}