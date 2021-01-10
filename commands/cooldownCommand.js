const { commandPrefix } = require('../config.json');

const cooldowns_cc = {};

module.exports = (client, aliases, commandName, cooldown, callback, cooldown_cb) => {
	cooldowns_cc[commandName] = false;

	if(typeof aliases === 'string') {
		aliases = [aliases];
	}

	client.on('chat', (channel, user, message, self) => {
		console.log(JSON.stringify(cooldowns_cc, 4));

		if(!self) {
			if(cooldowns_cc[commandName]) {
				cooldown_cb(message, channel, user);
			} else {
				aliases.forEach((alias) => {
					const command = `${commandPrefix}${alias}`;

					if(message.startsWith(`${command} `) || message == command) {
						console.log(`Running ${command}...`);
						
						cooldowns_cc[commandName] = true;

						setTimeout(() => {
							cooldowns_cc[commandName] = false;
						}, cooldown);

						callback(message, channel, user);
					}
				});
			}
		}
	});
}
