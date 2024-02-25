const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const axios = require("axios");
const mysql = require("mysql2/promise"); // Import the mysql2 library
const path = require("path");
// Get the current directory of the script
const currentDir = __dirname;

// Construct the path to config.json in the root folder
const configPath = path.join(currentDir, "../../../config.json");

try {
	// Load the configuration from the JSON file
	const rawconfig = fs.readFileSync(configPath);
	const config = JSON.parse(rawconfig);
} catch (error) {
	console.error("Error reading or parsing config.json:", error.message);
}

let config; // Declare config outside the try block

try {
	// Load the configuration from the JSON file or wherever you get it
	const rawconfig = fs.readFileSync(configPath);
	config = JSON.parse(rawconfig);

	// Create dbconfig based on the loaded configuration
	dbconfig = {
		host: config.mysqlip,
		user: config.mysqlusername,
		password: config.mysqlpassword,
		database: config.databasename,
	};

	// Rest of the code using dbconfig...
} catch (error) {
	console.error("Error reading or parsing config.json:", error.message);
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName("shortcut")
		.setDescription("Use a shortcut")
		.addStringOption((option) =>
			option.setName("text").setDescription("Input").setRequired(true)
		)
		.addUserOption((option) =>
			option.setName("user").setDescription("Optional user to mention")
		),

	async execute(interaction) {
		try {
			const optionValue = interaction.options.getString("text");
			const subcommand = optionValue === "list" ? "list" : "shortcut";

			if (subcommand === "list") {
				// If the option is "list", list all available shortcuts
				const shortcutList = Object.keys(config.Text).join(", ");
				await interaction.reply(`Available shortcuts: ${shortcutList}`);
				return;
			}

			const input = optionValue;
			const configValue = config.Text[input];

			if (!configValue) {
				await interaction.reply({
					content: `No configuration found for the provided input '${input}'.`,
					ephemeral: true,
				});
				return;
			}

			const userOption = interaction.options.getUser("user");
			const mentionedUser = userOption ? `<@${userOption.id}>` : "";

			// Replace %s in configValue with mentioned user or add at the end
			const finalConfigValue = configValue.includes("%s")
				? configValue.replace("%s", mentionedUser)
				: configValue + mentionedUser;

			// Check if the user has any of the admin roles
			const isAdmin = interaction.member.roles.cache.some((userRole) =>
				config.admingroup.includes(userRole.id)
			);

			if (!isAdmin) {
				await interaction.reply({
					content: "You do not have permission to use this command.",
					ephemeral: true,
				});
				return;
			}

			// Log all roles of the user to the console
			console.log(
				"User's Roles:",
				interaction.member.roles.cache.map((role) => role.id)
			);

			// Send the finalConfigValue as a message in the current channel
			await interaction.channel.send(finalConfigValue);
		} catch (error) {
			console.error("Error handling /shortcut command:", error);
			await interaction.reply({
				content:
					"An error occurred while processing the command. Please try again.",
				ephemeral: true,
			});
		}
	},
};
