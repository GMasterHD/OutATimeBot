const tmi = require("tmi.js");
const request = require("request");

const options = require("./options.json");

// Client is used for the bot
const client = new tmi.client(options["outatimebot"]);
// GMHD is used to perform streamelements admin commands
const gmhd = new tmi.client(options["gmasterhd"])

const data = require("./data.json");

const ign = "gmasterhd";
const guild = "Drachenkult"

client.connect();
gmhd.connect();

client.on('connected', (address, port) => {
	client.action('gmasterhd', "I'm now online!");
});
gmhd.on('connected', (address, port) => {
	gmhd.action("gmasterhd", "I'm now online!");
});

client.on('chat', (channel, user, message, self) => {
	// Returns messages from the bot
	if(self) { return; }
	// Current goals
	if(message === "!progress" || message === "!goals") {
		client.say(channel, "Aktuelle Ziele/Fortschritte:");

		// Hyperion Goal
		getMoneyOfPlayer(ign, data[ign]["profileID"], data[ign]["apiKey"], (money) => {
			const percent_hyperion = money["money"] / 600000000 * 100;
			client.say(channel, "1. Goal: Hyperion");
			client.say(channel, "Progress: " + getAsMillion(money["money"]) + "/600M Coins (" + roundOff(percent_hyperion, 2) + "%)");

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
	} else if(message === "!ign") {
		client.say(channel, "Mein Ingame Name: " + ign);
	} else if(message === "!guild") {
		client.say(channel, "Aktuell bin ich in der Gilde " + guild + "!");
	}

	// Help Command
	if(message === "!help") {
		client.say(channel, "!goals: Aktuelle Ziele/Fortschritte");
	}
});

function makeAPIRequest(url, callback) {
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

function getMoneyOfPlayer(username, profileID, apiKey, callback) {
	getUUIDByUsername(username, (uuid) => {
		makeAPIRequest(getPlayerProfileURL(profileID, apiKey), (profile) => {
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
