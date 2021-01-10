const tmi = require("tmi.js");
const request = require("request");
const json = require("json");
const fs = require("fs");
const net = require("net");
const colors = require("colors");

const options = require("./options.json");
const config = require("./config.json");

// Client is used for the bot
const client = new tmi.client(options["outatimebot"]);
// GMHD is used to perform streamelements admin commands
const gmhd = new tmi.client(options["gmasterhd"]);

const data = require("./data.json");
const { stringify } = require("querystring");
const { exit } = require("process");

const ign = "gmasterhd";
const guild = "Drachenkult";

// Commands
const command = require('./commands/command.js');
const cooldownCommand = require('./commands/cooldownCommand.js');
const countCommand = require('./commands/countCommand.js');

var persistant = require("./persistant.json");
var dungeonLoot = require("./dungeon_loot.json");
const { Server } = require("http");
const { Socket } = require("dgram");

client.connect();
gmhd.connect();

client.on('connected', (address, port) => {
	client.action('gmasterhd', "I'm now online!");

	cooldownCommand(client, ['progress', 'goals'], 'goals', 30000, (message, channel, user) => {
		// Hyperion Goal
		client.say(channel, "Aktuelle Ziele/Fortschritte:");

		getMoneyOfPlayer(ign, data[ign]["profileID"], data[ign]["apiKey"], (money) => {
			countItems("Mutant Nether Wart", ign, data[ign]["profileID"], (mnwCount) => {
				// Calculate the money from the player's purse, bank and the mutant netherwart price with count
				const money_total = money["money"] + mnwCount * config["npc_prices"]["mutant_nether_wart"];
				const percent_hyperion = money_total / 600000000 * 100;
				client.say(channel, "1. Goal: Hyperion (Beinhaltet alle Mutant Nether Warts)");
				client.say(channel, "Progress: " + getAsMillion(money_total) + "/600M Coins (" + roundOff(percent_hyperion, 2) + "%)");
				client.say(channel, "Mutant Nether Warts: " + mnwCount + "(" + getAsMillion(mnwCount * config["npc_prices"]["mutant_nether_wart"]) + "M Coins)");

				// Farming 40 Goal
				makeAPIRequest("https://sky.shiiyu.moe/api/v2/profile/gmasterhd", (profile) => {
					const farmingSkill_obj = profile["profiles"][data[ign]["profileID"]]["data"]["levels"]["farming"];
					const farmingSkill = farmingSkill_obj["level"] + farmingSkill_obj["progress"];

					// Get the percantage by farming xp              \/--- Required XP for lvl 40
					const percent_farming = farmingSkill_obj["xp"] / 25522425 * 100;

					client.say(channel, "2. Goal: Farming 40");
					client.say(channel, "Progress: Farming " + roundOff(farmingSkill, 2) + "/40 (" + roundOff(percent_farming, 2) + "%)");
				});
			});
		});
	}, () => {
		console.log("Command is on cooldown!".red);
	});

	cooldownCommand(client, ['ign', 'mc', 'minecraft'], 'ign', 10000, (message, channel, user) => {
		client.say(channel, `Mein IGN: ${ign}`);
	}, () => {
	});
	cooldownCommand(client, 'dc', 'dc', 10000, (message, channel, user) => {
		client.say(channel, 'Mein Discord: https://discord.gg/g6vpufRJxb');
	}, () => {
	});
	cooldownCommand(client, 'yt', 'yt', 10000, (message, channel, user) => {
		client.say(channel, "YT: https://www.youtube.com/channel/UCP_m357ysJ3tBsuuO_a_OTw");
	}, () => {
	});
	cooldownCommand(client, ['help', 'command', 'commands'], 'help', 10000, (message, channel, user) => {
		client.say(channel, "!dc: Mein discord server");
		client.say(channel, "!yt: Mein YouTube Kanal");
		client.say(channel, "!goals: Zeigt meine aktuellen SkyBlock Ziele");
		client.say(channel, "!bot: Zählt wie oft ich ein Bot im stream war");
		client.say(channel, "!lost: Zählt wie oft ich im Stream lost war");
	}, (message, channel, user) => {
		client.say(channel, "Der command hat aktuell einen cooldown!");
	})

	countCommand(client, 'bot', 5000, 'bot', (counters, message, channel, user, count) => {
		client.say(channel, `GMasterHD war schon ${count} ein bot im Stream! Richtiger Bot! MrDestructoid`);
		saveFile(counters);
	}, () => {
	});
	countCommand(client, 'lost', 5000, 'lost', (counters, message, channel, user, count) => {
		client.say(channel, `GMasterHD war schon ${count} lost im Stream! Wie peinlich ist das denn?! BloodTrail`);
		saveFile(counters);
	}, () => {
	});
});

function saveFile(counters) {
	console.log('Saving counters.json'.yellow);
	fs.writeFile('./counters.json', JSON.stringify(counters, 4, 4), (err) => {
		if(err) {
			console.error('Could not save counters.json!');
			console.error(err);
		} else {
			console.log('Successfully saved counters.json!'.green);
		}
	});
}

client.on('chat', (channel, user, message, self) => {
	// Returns messages from the bot1
	if(self) { return; }
});

function makeAPIRequest(url, callback) {
	console.log("API Request " + url + "!");
	request({
		url: url,
		json: true
	},
	(err, response, body) => {
		if(err) {
			console.error("Error with following Request: " + url + "!");
			console.error(err);
		} else {
			console.log("Body: " + body);
			callback(body);
		}
	});
}

function getUUIDByUsername(username, callback) {
	makeAPIRequest("https://api.mojang.com/users/profiles/minecraft/" + username, (data) => {
		callback(data["id"]);
	});
}

function countItems(item, username, profileID, callback) {
	makeAPIRequest("https://sky.shiiyu.moe/api/v2/profile/" + username, (data) => {
		console.log(data);
		const items = data["profiles"][profileID]["items"];
		var count = 0;

		// Iterate through the inventory
		for(var k in items["inventory"]) {
			if(items["inventory"][k]["display_name"] === item) {
				count += items["inventory"][k]["Count"];
			} else if(String(items["inventory"][k]["display_name"]).includes("Backpack")) {
				count += countItemsFromBackpack(items["inventory"][k]["containsItems"], item);
			}
		}

		console.log("Found " + count + " " + item + "!");
		callback(count);
	});
}

function countItemsFromBackpack(jsonArray, item) {
	var count = 0;
	for(var k in jsonArray) {
		if(jsonArray[k]["display_name"] === item) {
			count += jsonArray[k]["Count"];
		}
	}

	console.log("Found " + count + " " + item + "s in the current backpack!");
	return count;
}

function getMoneyOfPlayer(username, profileID, apiKey, callback) {
	getUUIDByUsername(username, (uuid) => {
		makeAPIRequest(getPlayerProfileURL(profileID, apiKey), (profile) => {
			console.log(profile);
			var bankMoney = Math.trunc(profile["profile"]["banking"]["balance"]);
			var purseMoney = Math.trunc(profile["profile"]["members"][uuid]["coin_purse"]);

			callback({
				bankMoney: bankMoney,
				purseMoney: purseMoney,
				money: bankMoney + purseMoney
			});
		});
	});
}

function getPlayerProfileURL(profileID, apiKey) {
	return "https://api.hypixel.net/skyblock/profile?key=" + apiKey + "&profile=" + profileID;
}

function roundOff(num, places) {
	const x = Math.pow(10, places);
	return Math.round(num * x) / x;
}

function getAsMillion(num) {
	return roundOff(num / 1000000, 1);
}
