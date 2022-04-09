const fs = require('fs');

function log(toWrite) {
	let logs = fs.readFileSync(`${__dirname}/log.txt`);
	let time = new Date().toLocaleString();
	logs = logs.toString().split('/n')
	logs.push(`${time} | ${toWrite}`)
	logs = logs.join('\n')
	logs = logs.replace(' 1:', ' 01:')
	fs.writeFileSync(`${__dirname}/log.txt`,logs)
}

module.exports = [log]
