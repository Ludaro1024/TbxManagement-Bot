const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const axios = require("axios");
const mysql = require("mysql2/promise"); // Import the mysql2 library

// Load the config.json file
const configPath = "./config.json"; // Assuming it's in the same directory as your script

// Declare apiKey at a higher scope
let apiKey = "0f5fd4ff08f041bba59c3d929bcaec7d79514819";
let tableName = "tbx-id-bot"; // Set the table name here

// Database configuration
const dbConfig = {
	host: "localhost", // Replace with your MySQL host
	user: "jeycraft", // Replace with your MySQL username
	password: "rIe6$1I40w0", // Replace with your MySQL password
	database: "your_database_name", // Replace with your database name
};

// Create a MySQL connection pool
const pool = mysql.createPool(dbConfig);

function giveDiscordRole(roleId, discordClient, guildId, userId) {
	// Implement your logic to give the Discord role using the roleId and Discord.js
	const guild = discordClient.guilds.cache.get(guildId);
	const member = guild.members.cache.get(userId);
	const role = guild.roles.cache.get(roleId);

	if (guild && member && role) {
		member.roles.add(role);
		console.log(`Gave role ${role.name} to user ${member.user.tag}`);
	} else {
		console.error("Failed to give role. Check guild, member, and role exist.");
	}
}
// Function to check if a Tebex ID exists

// Create the database and table if they don't exist
(async () => {
	const connection = await mysql.createConnection({
		host: dbConfig.host,
		user: dbConfig.user,
		password: dbConfig.password,
	});

	try {
		// Create the database if it doesn't exist
		await connection.query(
			`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`
		);
		console.log(`Database '${dbConfig.database}' created or already exists.`);
	} catch (error) {
		console.error("Error creating database:", error);
	} finally {
		await connection.end();
	}

	const db = mysql.createPool({ ...dbConfig, database: dbConfig.database });

	try {
		// Create the table if it doesn't exist
		await db.query(`
            CREATE TABLE IF NOT EXISTS \`${tableName}\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                discordid VARCHAR(255),
                developerdiscordid VARCHAR(255),
                tbxid VARCHAR(255)
            )
        `);
		console.log(`Table '${tableName}' created or already exists.`);
	} catch (error) {
		console.error("Error creating table:", error);
	} finally {
		db.end();
	}
})();

try {
	const rawData = fs.readFileSync(configPath);
	const configData = JSON.parse(rawData);

	// Now you can access the configuration data from configData object
	apiKey = configData.tebexSecret;
	// ...
} catch (error) {
	console.error("Error reading config.json:", error);
}

// Function to check if a Tebex ID exists
async function doesTebexIdExist(apiKey, tbxId) {
	const headers = {
		"X-Tebex-Secret": apiKey,
	};

	const response = await axios.get(
		`https://plugin.tebex.io/payments/${tbxId}`,
		{ headers }
	);
	return [true, response];
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName("claimdev")
		.setDescription("Claim a TBX ID as a developer")
		.addStringOption((option) =>
			option.setName("tbx-id").setDescription("Your TBX ID").setRequired(true)
		),

	async execute(interaction) {
		try {
			// Get the value of the 'tbx-id' option and user's Discord ID
			const tbxId = interaction.options.getString("tbx-id");
			const userId = interaction.user.id;

			// Check if the Tebex ID exists
			const [tebexIdExists, tbxData] = await doesTebexIdExist(apiKey, tbxId);

			if (!tebexIdExists) {
				await interaction.reply({
					content: `TBX ID '${tbxId}' does not exist or is invalid.`,
					ephemeral: true,
				});
				return;
			}

			// Check if the user's Discord ID is already claimed for this TBX ID
			const [rows] = await pool.query(
				`SELECT * FROM \`${tableName}\` WHERE tbxid = ?`,
				[tbxId]
			);
			if (rows[0].discordid == null) {
				// User's Discord ID is not claimed for this TBX ID
				await interaction.reply({
					content: `TBX ID '${tbxId}' has not been claimed for your Discord ID. Please use /claim first.`,
					ephemeral: true,
				});
			} else if (rows[0].developerdiscordid) {
				// Check if the `developerdiscordid` is not empty (claimed by another user)
				await interaction.reply({
					content: `TBX ID '${tbxId}' has already been claimed by another user as a developer.`,
					ephemeral: true,
				});
			} else if (rows[0].discordid === userId) {
				// Check if the `discordid` in the database is the same as the current user's Discord ID
				await interaction.reply({
					content: "You cannot claim the same TBX ID twice.",
					ephemeral: true,
				});
			} else {
				// Update `developerdiscordid` if it was not claimed by another user
				await pool.query(
					`UPDATE \`${tableName}\` SET developerdiscordid = ? WHERE tbxid = ?`,
					[userId, tbxId]
				);
				packages = tbxData.data.packages;
				if (packages && packages.length > 0) {
					for (const package of packages) {
						scriptName = package.name;
						if (scripts[scriptName]) {
							const discordRole = scripts[scriptName];
							giveDiscordRole(
								discordRole,
								interaction.client,
								interaction.guild.id,
								userId
							);
						}
					}
				} else {
					console.log("No packages found in tbxData.data.packages");
				}
				await interaction.reply({
					content: `TBX ID '${tbxId}' has been successfully claimed as a developer.`,
					ephemeral: true,
				});
			}
		} catch (error) {
			console.error("Error handling /claimdev command:", error);
			await interaction.reply({
				content: "An error occurred while processing the command.",
				ephemeral: true,
			});
		}
	},
};
