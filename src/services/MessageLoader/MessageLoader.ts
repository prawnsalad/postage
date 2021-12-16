import loaderIndexdb from './Indexdb';
import loaderServer from './Server';
import type { IMessageSourceLoader } from '@/types/common';

const l1 = new loaderIndexdb({dbname: 'mailapp'});
await l1.init();

const l2 = new loaderServer({});
await l2.init();

// Later loaders in the array can update the earlier ones. ie. changes in [1] takes
// presidence over [0]
const loaders = [l1, l2];

interface IMessageFilters {
    labelsIds?: number[],
    dateTo?: Date,
    dateFrom?: Date,

}

export function getLatest(filters: IMessageFilters={}): IMessageSourceLoader {
    let response: IMessageSourceLoader = {
        // A promise for each source. Each get resolved as each source completes
        sources: [],
        // An array of messages
        messages: [],
        // An object mapping {id: message} for faster lookup
        messageMap: Object.create(null),
    };

    for (let l of loaders) {
        let prom = l.getLatest(response, filters.labelsIds || []);
        response.sources.push(prom);
    }

    return response;
}

export function getThread(threadId: string): IMessageSourceLoader {
    let response: IMessageSourceLoader = {
        // A promise for each source. Each get resolved as each source completes
        sources: [],
        // An array of messages
        messages: [],
        // An object mapping {id: message} for faster lookup
        messageMap: Object.create(null),
    };

    for (let l of loaders) {
        let prom = l.getThread(response, threadId);
        response.sources.push(prom);
    }

    return response;
}

/*
get meta data:
 - get latest messages from a label (inbox, sent, etc) or several labels
 - search within labels

get full message (including body)
 - from a group of IDs

*/