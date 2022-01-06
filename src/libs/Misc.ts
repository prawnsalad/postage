export function splitAddr(inp: string) {
    let ret = {
        name: '',
        address: '',
        display: '',
    };
    let pos = inp.indexOf('<');
    if (pos > -1) {
        ret.name = inp.substr(0, pos).trim();
        ret.address = inp.substr(pos+1).replace('>', '').trim();
    } else {
        ret.name = inp.trim();
    }

    ret.display = ret.name || ret.address;
    return ret;
}
