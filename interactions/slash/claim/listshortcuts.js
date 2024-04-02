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
        .setName("listshortcuts")
        .setDescription("List all shortcuts"),

    async execute(interaction) {
        try {
            // Retrieve all shortcuts from the database
            const [rows] = await db.execute("SELECT * FROM `shortcuts`");

            if (rows.length === 0) {
                await interaction.reply({
                    content: "No shortcuts found.",
                    ephemeral: true
                });
                return;
            }
    
            // Format and list all shortcuts with the person who added them
            let shortcutsList = "List of shortcuts:\n";
            rows.forEach(row => {
                shortcutsList += `1. __${row.shortcutname}__ \n **${row.shortcutvalue}**\nHas to be Admin: ${row.needstobeadmin === 1}\n\n\n`;
            });

            await interaction.reply(shortcutsList);
        } catch (error) {
            console.error("Error handling /listshortcuts command:", error);
            await interaction.reply({
                content: "An error occurred while processing the command. Please try again.",
                ephemeral: true
            });
        }
    },
};
