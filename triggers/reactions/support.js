// const fs = require("fs");
// const path = require("path");
// const { MessageActionRow, MessageButton } = require("discord.js");

// const configPath = path.join(__dirname, "../../config.json");
// let config;

// try {
// 	const rawConfig = fs.readFileSync(configPath);
// 	config = JSON.parse(rawConfig);
// } catch (error) {
// 	console.error("Error reading or parsing config.json:", error.message);
// }

// const muteDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
// const blacklistDuration = 2 * 60 * 1000; // 2 minutes in milliseconds

// const tempLinkRecords = {};
// const blacklist = {};

// module.exports = {
// 	name: ["support"],

// 	async execute(message, args) {
// 		console.log("Support command triggered");
// 	},
// };
