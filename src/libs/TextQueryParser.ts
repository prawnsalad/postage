export function tokenise(input: string): string[] {
    let quoteChars = `'"`;
    let escapeChars = `\\`;

    let tokens: string[] = [];
    let scratch = '';

    let inQuote = '';
    let pos = 0;
    let char = '';
    while (pos < input.length) {
        char = input[pos];

        if (isEscape()) {
            scratch += input[pos+1] || '';
            pos += 2;
            continue;
        }

        // within a quote, include everything
        if (inQuote && char !== inQuote) {
            scratch += char;
            pos++;
            continue;
        }
        // within a quote and hit the closing quote
        if (inQuote && char === inQuote) {
            inQuote = '';
            pushToken();
            pos++;
            continue;
        }
        // opening a quote
        if (!inQuote && isQuote()) {
            inQuote = char; // we check for a matching quote to close it
            pos++;
            continue;
        }

        if (char === ' ') {
            pushToken();
            pos++;
            continue;
        }

        scratch += char;
        pos++;
    }

    if (scratch) pushToken();
    return tokens;

    function isQuote() {
        return quoteChars.includes(char);
    }
    function isEscape() {
        return escapeChars.includes(char);
    }
    function pushToken() {
        if (scratch) tokens.push(scratch);
        scratch = '';
    }
}

export interface IQueryTag {
    tag: string,
    value: string,
    include: number,
    exclude: number,
}

export function parseTokens(tokens: string[], _opts={}) {
    let opts = Object.assign({
        match: ':',
        defaultTag: 'term',
        shortTags: {'@': 'username', '#': 'hashtag'},
    }, _opts);

    let tags: IQueryTag[] = [];
    for (let tok of tokens) {
        let tag = {tag: '', value: '', include: 0, exclude: 0};
        tags.push(tag);

        // total up the +- modifiers. could be used for weighting
        while (tok[0] === '+' || tok[0] === '-') {
            if (tok[0] === '+') {
                tag.include++;
                tok = tok.substr(1);
            }
            if (tok[0] === '-') {
                tag.exclude++;
                tok = tok.substr(1);
            }
        }

        // Check for things like @mentions #hashtag prefixes
        if (opts.shortTags.hasOwnProperty(tok[0])) {
            tag.tag = opts.shortTags[tok[0]];
            tag.value = tok.substr(1);

            continue;
        }

        // Look for the match separator. eg. tag:value
        let pos = tok.indexOf(opts.match);
        if (pos === -1) {
            tag.tag = opts.defaultTag;
            tag.value = tok;
        } else {
            tag.tag = tok.substr(0, pos);
            tag.value = tok.substr(pos+1);
        }
    }

    return tags;
}

export function parseQuery(input: string, opts={}) {
    let tokens = tokenise(input);
    return parseTokens(tokens, opts);
}

/*
let t = `delivery has:attachment from:"darren whit" @darrenwhit:len #hashtag #lol filename:bloom.jpg`;
console.log('> ' + t)
let tokens = tokenise(t);
console.log(tokens);
console.log(parseTokens(tokens, {}));
*/