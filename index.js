const tmi = require("tmi.js");
const request = require("request");
const json = require("json");
const fs = require("fs");

const options = require("./options.json");
const config = require("./config.json");

// Client is used for the bot
const client = new tmi.client(options["outatimebot"]);
// GMHD is used to perform streamelements admin commands
const gmhd = new tmi.client(options["gmasterhd"])

const data = require("./data.json");
const { stringify } = require("querystring");
const { exit } = require("process");

const ign = "gmasterhd";
const guild = "Drachenkult"

var cooldowns = {
	goals: false,
	lost: false,
	times: {
		goals: 30000,
		lost: 10000
	}
}

var persistant = require("./persistant.json");

client.connect();
gmhd.connect();

client.on('connected', (address, port) => {
	client.action('gmasterhd', "I'm now online!");
});

client.on('chat', (channel, user, message, self) => {
	// Returns messages from the bot1
	if(self) { return; }

	// Current goals
	if(message === "!progress" || message === "!goals") {
		if(!cooldowns["goals"]) {
			client.say(channel, "Aktuelle Ziele/Fortschritte:");

			// Hyperion Goal
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

			cooldowns["goals"] = true;

			setTimeout(() => {
				cooldowns["goals"] = false;
			}, cooldowns["times"]["goals"]);
		} else {
			client.say(channel, "Dieser Command hat aktuell einen cooldown!");
		}
	} else if(message === "!ign") {
		client.say(channel, "Mein Ingame Name: " + ign);
	} else if(message === "!guild") {
		client.say(channel, "Aktuell bin ich in der Gilde " + guild + "!");
	} else if(message.startsWith("!stats")) {
		const args = message.split(" ");

		if(args.length === 2) {
			client.say(channel, args[1] + "'s Stats: https://sky.shiiyu.moe/" + args[1]);
		} else {
			client.say(channel, "Zu viele/wenige command arguments! Syntax: !stats <username>");
		}
	} else if(message === "!lost") {
		if(!cooldowns["lost"]) {
			persistant["counters"]["lost"]++;
			cooldowns["lost"] = true;
			client.say(channel, "GMasterHD war schon " + persistant["counters"]["lost"] + " mal Lost im stream! Wie peinlich ist das?! BloodTrail");
		
			fs.writeFile("./persistant.json", JSON.stringify(persistant, 4), (err) => {
				if(err) {
					console.error("Could not save persistant.json! " + err);
				}
			});
			setTimeout(() => {
				cooldowns["lost"] = false;
			}, cooldowns["time"]["lost"]);
		} else {
			client.say(channel, "Dieser Command hat aktuell einen cooldown!");
		}
	}

	// Help Command
	if(message === "!help" || message === "!commands") {
		client.say(channel, "!goals: Aktuelle Ziele/Fortschritte");
		client.say(channel, "!ign: Mein Ingame Name");
		client.say(channel, "!guild: Meine aktuelle Guilde");
	}
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
		/*items["inventory"].foreach((obj) => {
			if(obj["display_name"] === item) {
				count += obj["Count"];
			} else if(obj["display_name"].includes("Backpack")) {
				count += countItemsFromBackpack(obj["containsItems"], item);
			}
		});*/
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
	/*jsonArray.foreach((obj) => {
		if(obj["display_name" === item]) {
			count += obj["Count"];
		}
	});*/
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
