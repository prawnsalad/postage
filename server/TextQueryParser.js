"use strict";
exports.__esModule = true;
exports.parseQuery = exports.parseTokens = exports.tokenise = void 0;
function tokenise(input) {
    var quoteChars = "'\"";
    var escapeChars = "\\";
    var tokens = [];
    var scratch = '';
    var inQuote = '';
    var pos = 0;
    var char = '';
    while (pos < input.length) {
        char = input[pos];
        if (isEscape()) {
            scratch += input[pos + 1] || '';
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
    if (scratch)
        pushToken();
    return tokens;
    function isQuote() {
        return quoteChars.includes(char);
    }
    function isEscape() {
        return escapeChars.includes(char);
    }
    function pushToken() {
        if (scratch)
            tokens.push(scratch);
        scratch = '';
    }
}
exports.tokenise = tokenise;
function parseTokens(tokens, _opts) {
    if (_opts === void 0) { _opts = {}; }
    var opts = Object.assign({
        match: ':',
        defaultTag: 'term',
        shortTags: { '@': 'username', '#': 'hashtag' },
        groupWords: ['or', 'and'],
        defaultGroupWord: 'and'
    }, _opts);
    var groupedTags = [{
            type: opts.defaultGroupWord, tags: []
        }];
    for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
        var tok = tokens_1[_i];
        if (opts.groupWords.indexOf(tok) > -1) {
            groupedTags.push({
                type: tok,
                tags: []
            });
            continue;
        }
        var tag = { tag: '', value: '', include: 0, exclude: 0 };
        groupedTags[groupedTags.length - 1].tags.push(tag);
        // total up the +- modifiers. could be used for weighting (ie. +++triple +single)
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
        var pos = tok.indexOf(opts.match);
        if (pos === -1) {
            tag.tag = opts.defaultTag;
            tag.value = tok;
        }
        else {
            tag.tag = tok.substr(0, pos);
            tag.value = tok.substr(pos + 1);
        }
    }
    return groupedTags;
}
exports.parseTokens = parseTokens;
function parseQuery(input, opts) {
    if (opts === void 0) { opts = {}; }
    var tokens = tokenise(input);
    return parseTokens(tokens, opts);
}
exports.parseQuery = parseQuery;
/*
let t = `delivery has:attachment from:"darren whit" @darrenwhit:len #hashtag #lol filename:bloom.jpg`;
console.log('> ' + t)
let tokens = tokenise(t);
console.log(tokens);
console.log(parseTokens(tokens, {}));
*/ 
