export interface ILabel {
    id: string | number,
    name: string,
    custom: boolean
}

export interface IMessage {
    id: string,
    threadId: string,
    from: string,
    to: string[],
    cc: string[],
    bcc: string[],
    subject: string,
    body: string,
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
