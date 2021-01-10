const { commandPrefix } = require('../config.json');
const counters = require('../counters.json');

const cooldowns = {};

const fs = require('fs');

module.exports = (client, aliases, cooldown, countName, callback, cooldown_cb) => {
	cooldowns[countName] = false;

	if(counters[countName] === undefined) {
		counters[countName] = 0;
	}

	if(typeof aliases === 'string') {
		aliases = [aliases];
	}

	client.on('chat', (channel, user, message, self) => {
		if(!self) {
			if(cooldowns[countName]) {
				cooldown_cb(channel, user, message);
			} else {
				aliases.forEach((alias) => {
					const command = `${commandPrefix}${alias}`;
	
					if(message.startsWith(`${command} `) || message == command) {
						console.log(`Running ${command}...`);
	
						counters[countName]++;
	
						console.log(JSON.stringify(counters, 4));
	
						cooldowns[countName] = true;
	
						setTimeout(() => {
							cooldowns[countName] = false;
						}, cooldown);
	
						callback(counters, message, channel, user, counters[countName]);
					}
				});
			}
		}
	});
}
