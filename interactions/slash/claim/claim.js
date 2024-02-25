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
	const rawConfig = fs.readFileSync(configPath);
	const config = JSON.parse(rawConfig);
} catch (error) {
	console.error("Error reading or parsing config.json:", error.message);
}

let config; // Declare config outside the try block

try {
	// Load the configuration from the JSON file or wherever you get it
	const rawConfig = fs.readFileSync(configPath);
	config = JSON.parse(rawConfig);

	// Create dbConfig based on the loaded configuration
	dbConfig = {
		host: config.mysqlip,
		user: config.mysqlusername,
		password: config.mysqlpassword,
		database: config.databasename,
	};

	// Rest of the code using dbConfig...
} catch (error) {
	console.error("Error reading or parsing config.json:", error.message);
}

let tableName = config.tableName;

// Create a MySQL connection pool
const pool = mysql.createPool(dbConfig);

function giveDiscordRole(roleId, discordClient, guildId, userId, scriptname) {
	// Implement your logic to give the Discord role using the roleId and Discord.js
	const guild = discordClient.guilds.cache.get(guildId);
	const member = guild.members.cache.get(userId);
	const role = guild.roles.cache.get(roleId);

	if (guild && member && role) {
		member.roles.add(role);
		console.log(`Gave role ${role.name} to user ${member.user.tag}`);
		// make the bot say it also to the user
		member.send(
			`You have been given the role ${role.name} for the script ${scriptname}`
		);
	} else {
		console.error("Failed to give role. Check guild, member, and role exist.");
	}
}

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
            CREATE TABLE IF NOT EXISTS \`${config.tableName}\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                discordid VARCHAR(255),
                developerdiscordid VARCHAR(255),
                tbxid VARCHAR(255),
				keymastername VARCHAR(255)
            )
        `);
		console.log(`Table '${config.tableName}' created or already exists.`);
	} catch (error) {
		console.error("Error creating table:", error);
	} finally {
		db.end();
	}
})();

// Function to check if a Tebex ID exists
async function doesTebexIdExist(apiKey, tbxId) {
	const headers = {
		"X-Tebex-Secret": apiKey,
	};

	const response = await axios.get(
		`https://plugin.tebex.io/payments/${tbxId}`,
		{ headers }
	);

	if (response.status === 200) {
		const responseData = response.data;
		const keymaster = responseData.player.name;

		return [true, responseData, keymaster];
	} else if (response.status === 404) {
		return [false, null, null];
	} else {
		throw new Error(`Tebex API returned an error: ${response.statusText}`);
	}
}
module.exports = {
	data: new SlashCommandBuilder()
		.setName("claim")
		.setDescription("Claim your scripts")
		.addStringOption((option) =>
			option.setName("tbx-id").setDescription("Your TBX ID").setRequired(true)
		),

	async execute(interaction) {
		try {
			// Get the value of the 'tbx-id' option
			const tbxId = interaction.options
				.getString("tbx-id")
				.replace(/^tbx-/i, "");
			const userId = interaction.user.id;
			// Check if the Tebex ID exists
			const [tebexIdExists, tbxData, keymastername] = await doesTebexIdExist(
				config.tebexSecret,
				tbxId
			);
			if (!tebexIdExists) {
				await interaction.reply({
					content: `TBX ID '${tbxId}' does not exist or is invalid.`,
					ephemeral: true,
				});
				return;
			}

			// Check if the user's discord ID is already claimed in the database
			const [rows] = await pool.query(
				`SELECT * FROM \`${tableName}\` WHERE discordid = ? AND tbxid = ?`,
				[userId, tbxId]
			);

			if (rows.length === 0) {
				// User's discord ID is not claimed, insert it into the database
				await pool.query(
					`INSERT INTO \`${tableName}\` (discordid, developerdiscordid, tbxid, keymastername) VALUES (?, ?, ?, ?)`,
					[userId, "", tbxId, keymastername || null] // Use null if keymastername is not available
				);

				if (config.Debug) {
					console.log(tbxData);
					console.log(tbxData.packages.length);
				}
				// Check if tbxData.data exists and has packages
				if (tbxData && tbxData.packages && tbxData.packages.length > 0) {
					for (const package of tbxData.packages) {
						scriptName = package.name;

						if (config.Scripts[scriptName]) {
							const discordRole = config.Scripts[scriptName];
							giveDiscordRole(
								discordRole,
								interaction.client,
								interaction.guild.id,
								userId,
								scriptName
							);
						}
					}
				} else {
					console.log("No packages found in tbxData.data.packages");
				}

				await interaction.reply({
					content: `TBX ID '${tbxId}' has been successfully claimed.`,
					ephemeral: true,
				});
			} else {
				// User's discord ID is already claimed
				await interaction.reply({
					content: `TBX ID '${tbxId}' has already been claimed for your Discord ID.`,
					ephemeral: true,
				});
			}
		} catch (error) {
			console.error("Error handling /claim command:", error);
			await interaction.reply({
				content:
					"An error occurred while processing the command. Is the tbx id wrong? ().",
				ephemeral: true,
			});
		}
	},
};
