export interface ILabel {
    id: number,
    name: string,
    custom: boolean
}

export interface IMessageLoader {
    id: string,
    src: IMessage,
    state: 'loading' | 'loaded' | 'failed'
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
    labels: Array<number>
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
