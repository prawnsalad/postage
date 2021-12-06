export interface Deferred<T> extends Promise<T> {
    resolve(value?: T): void,
    reject(reason?: any): void,
}

export default function makeDeferred<T>() {
    let resolve;
    let reject;
    let p: any = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    p.resolve = resolve;
    p.reject = reject;
    return p as Deferred<T>;
}
