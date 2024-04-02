const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const axios = require("axios");
const mysql = require("mysql2/promise"); // Import the mysql2 library
const path = require("path");
// Get the current directory of the script
const currentDir = __dirname;

// Construct the path to config.json in the root folder
const configPath = path.join(currentDir, "../../../config.json");
const db = mysql.createPool({ ...dbConfig, database: dbConfig.database });

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
        .setName("createshortcut")
        .setDescription("Create a shortcut")
        .addStringOption(option =>
            option.setName("shortcutname")
                .setDescription("Name of the shortcut")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("shortcutoutput")
                .setDescription("Output of the shortcut")
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option.setName("needstobeadmin")
                .setDescription("Whether the user needs to be an admin to use this shortcut")
            ),

    async execute(interaction) {
        try {
            // Check if the user has admin roles
            const isAdmin = interaction.member.roles.cache.some(userRole =>
                config.admingroup.includes(userRole.id)
            );

            if (!isAdmin) {
                await interaction.reply({
                    content: "You don't have permission to use this command.",
                    ephemeral: true
                });
                return;
            }

            const shortcutName = interaction.options.getString("shortcutname");
            const shortcutOutput = interaction.options.getString("shortcutoutput");
            const needsToBeAdmin = interaction.options.getBoolean("needstobeadmin");
            const userId = interaction.user.id;
const db = mysql.createPool({ ...dbConfig, database: dbConfig.database });

            // Check if the shortcut already exists for the user
            const [rows] = await db.query(
                `SELECT * FROM \`${config.shortcuttablename}\` WHERE shortcutname = ?`,
                [userId, shortcutName]
            );

            if (rows.length === 0) {
                // Insert the shortcut into the database
                await db.query(
                    `INSERT INTO \`${config.shortcuttablename}\` (discordid, shortcutname, shortcutvalue, needstobeadmin) VALUES (?, ?, ?, ?)`,
                    [userId, shortcutName, shortcutOutput, needsToBeAdmin]
                );

                await interaction.reply({
                    content: `Shortcut '${shortcutName}' has been created with output: ${shortcutOutput}`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: `Shortcut '${shortcutName}' already exists for your Discord ID.`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error("Error handling /createshortcut command:", error);
            await interaction.reply({
                content: "An error occurred while processing the command.",
                ephemeral: true
            });
        }
    },
};