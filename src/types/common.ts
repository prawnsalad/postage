export interface ILabel {
    id: number,
    name: string,
    custom: boolean
}

export interface IMessageSourceLoader {
    sources: Promise<any>[],
    messages: IMessage[],
    messageMap: {[key: string]: IMessage},
}
export interface IMessage {
    id: string,
    threadId: string,
    from: string,
    to: string[],
    cc: string[],
    bcc: string[],
    subject: string,
    bodyText: string,
    bodyHtml: string,
    snippet: string,
    labels: Array<number>,
    recieved: number,
    read: number,
}

export interface IContact {
    name: string,
    emails: string[],
    label: ''
}

export interface IComposeOptions {
    showTopic: boolean,
    showHeader: boolean,
    focus: 'to' | 'cc' | 'body'
}
