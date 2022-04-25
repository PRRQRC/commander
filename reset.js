import fs from 'fs';
fs.rmSync(__dirname + '\\auth\\authenticated.json');
fs.rmSync(__dirname + '\\log.log');
fs.writeFileSync(__dirname + '\\auth\\authenticated.json', JSON.stringify({}))
fs.writeFileSync(__dirname + '\\log.log', '')
