import fs from 'fs';
fs.rm(__dirname + '/e.json');
fs.rm(__dirname + '/log.log');
fs.writeFileSync(__dirname + '/auth/authenticated.json', JSON.stringify({}))
fs.writeFileSync(__dirname + '/log.log', '')
