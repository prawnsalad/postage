const _ = require('lodash');

module.exports.User = function User(source={}) {
    let template = {
        _id: '',
        name: '',
        password: '',
        sources: [ /* UserSource */ ],
        labels: [ /* UserLabel */ ],
        policies: {},
        sessions: [],
    };

    return _.merge(template, source);
}

module.exports.UserSource = function UserSource(source={}) {
    let template = {
        _id: '',
        name: '',
        type: '',
        ingestPing: 0,
        host: '',
        port: 993,
        tls: true,
        auth_user: '',
        auth_pass: '',
        imapUid: '',
    };

    return _.merge(template, source);
}

module.exports.UserLabel = function UserLabel(source={}) {
    let template = {
        _id: '',
        name: '',
        filter: {
            raw: '',
            parsed: {},
        },
    };

    return _.merge(template, source);
}

module.exports.UserSession = function UserSession(source={}) {
    let template = {
        _id: '',
        agent: '',
        agentVersion: '',
        // if country+fingerprint changes, logout
        agentFingerprint: '',
        country: '',
        seen: 0,
    };

    return _.merge(template, source);
}

module.exports.Thread = function Thread(source={}) {
    let template = {
        _id: '',
        accountId: '',
        sourceId: '',
        lastRecieved: 0,
        messages: [ /* ThreadMessage */ ],
    };

    return _.merge(template, source);
}

module.exports.ThreadMessage = function ThreadMessage(source={}) {
    let template = {
        _id: '',
        messageId: '',
        threadId: '',
        subject: '',
        // https://nodemailer.com/extras/mailparser/#address-object
        from: [],
        to: [],
        cc: [],
        bcc: [],
        bodyText: '',
        bodyHtml: '',
        labels: [ /* string */ ],
        recieved: 0,
        read: 0,
        inReplyTo: '',
        references: [],
        attachments: [ /* ThreadMessageAttachment */ ],
        // TODO: Fill this source with any attachment contents removed so its not bloated up
        source: '',
        sourceId: '',
        imapUid: '',
    };

    return _.merge(template, source);
}

module.exports.ThreadMessageAttachment = function ThreadMessageAttachment(source={}) {
    let template = {
        filename: '',
        type: '',
        cid: '',
        size: 0,
    };

    return _.merge(template, source);
}