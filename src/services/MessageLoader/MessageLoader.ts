import loaderIndexdb from './Indexdb';
import loaderServer from './Server';
import type { IMessage, IMessageSourceLoader } from '@/types/common';

const l1 = new loaderIndexdb({dbname: 'mailapp'});
await l1.init();

const l2 = new loaderServer({});
await l2.init();

const loaders = [
    l1,
    l2,
];

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

    // l1.getLatest(response, filters.labelsIds || []);
    l2.getLatest(response, filters.labelsIds || []);

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

    //l1.getThread(response, threadId);
    l2.getThread(response, threadId);

    return response;
}

/*
get meta data:
 - get latest messages from a label (inbox, sent, etc) or several labels
 - search within labels

get full message (including body)
 - from a group of IDs

*/