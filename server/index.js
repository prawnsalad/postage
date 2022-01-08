const fs = require('fs');
const { fork } = require('child_process');
const toml = require('toml');

let configRaw = '';
let config = {};
try {
    configRaw = fs.readFileSync(process.env.CONFIG || './config.toml', { encoding: 'utf8'} );
} catch (err) {
    console.error('Error reading config file: ' + err.message);
    process.exit(1);
}

try {
    config = global.config = toml.parse(configRaw);
} catch (e) {
    console.error(`Error parsing the config file on line ${e.line}, column ${e.column}: ${e.message}`);
    process.exit(1);
}

if (process.argv.includes('--imap')) {
    require('./imapimport/');
} else {
    require('./webserver/');

    if (config.imapimporter?.enabled) {
        runImapImporter();
    }
}


function runImapImporter() {
    let child = fork(__dirname + '/index.js', ['--imap'], { env: {config: process.env.config} });
    child.on('close', () => {
        setTimeout(runImapImporter, 1000);
    })
}