const fs = require('fs');
const chalk = require('chalk'); // only works with version 2.4.1, so make sure its in your package.json
// for comments with examples, message to write is 'fefe' and time is 01:15 PM plus 58 seconds
function log(toWrite, noConsole=false) {
	// this line could probably be written to make it shorter but im too lazy to care and cant be fucked to find a better way to do it
	let time = new Date().toLocaleString().replace(' 1:', ' 01:').replace(' 2:', ' 02:').replace(' 3:', ' 03:').replace(' 4:', ' 04:').replace(' 5:', ' 05:').replace(' 6:', ' 06:').replace(' 7:', ' 07:').replace(' 8:', ' 08:').replace(' 9:', ' 09:').replace(' 0:', ' 00:');
	let logs = fs.readFileSync(`${__dirname}/log.txt`); // get the current logs
	logs = logs.toString().split('/n'); // turn it into an array to add the time, yes i could do logs+= but cant be fucked, feel free to change it
	logs.push(`${time} | ${toWrite}`); // add the time, formatted like "13:15:58 | fefe"
	logs = logs.join('\n'); // turn the array with the added text back into a string
	if (!noConsole) {
		console.log(`${chalk.magentaBright(time)} | ${toWrite}`)
		//when called like this (see line 13), dont output it to the console, otherwise output it to the console
		//log('fefe', true)
	}
	if (toWrite.startsWith('JOBS | Checking')) return; // dont log the job checking, it takes up too much space in the log file
	fs.writeFileSync(`${__dirname}/log.log`,logs); // write the updated log back to a file
}
module.exports = {log}
