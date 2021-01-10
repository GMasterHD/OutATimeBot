const { commandPrefix } = require('../config.json');

module.exports = (client, aliases, callback) => {
	if(typeof aliases === 'string') {
		aliases = [aliases];
	}

	client.on('chat', (channel, user, message, self) => {
		if(!self) {
			aliases.forEach((alias) => {
				const command = `${commandPrefix}${alias}`;

				if(message.startsWith(`${command} `) || message == command) {
					console.log(`Running ${command}...`);
					callback(message, channel, user);
				}
			});
		}
	});
}
