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
        .setName("shortcut")
        .setDescription("Use a shortcut")
        .addStringOption(option =>
            option.setName("text").setDescription("Input").setRequired(true)
        )
        .addUserOption(option =>
            option.setName("user").setDescription("Optional user to mention")
        ),

    async execute(interaction) {
        try {
            const optionValue = interaction.options.getString("text");
            const input = optionValue;
            const userOption = interaction.options.getUser("user");
            const userId = interaction.user.id;
            const mentionedUser = userOption ? `<@${userOption.id}>` : "";

            // Check if the shortcut exists in the database
            const [rows] = await db.execute(
                `SELECT * FROM \`shortcuts\` WHERE shortcutname = ?`,
                [input]
            );

            if (rows.length === 0) {
                await interaction.reply({
                    content: `No shortcut found for the provided input '${input}'.`,
                    ephemeral: true
                });
                return;
            }

            const shortcutValue = rows[0].shortcutvalue;

            // Replace %s in shortcutValue with mentioned user or add at the end
            const finalShortcutValue = shortcutValue.includes("%s")
                ? shortcutValue.replace("%s", mentionedUser)
                : shortcutValue + mentionedUser;

            // Send the finalShortcutValue as a message in the current channel
            needstobeadmin = rows[0].needstobeadmin === 1 ? true : false;

            isAdmin = interaction.member.roles.cache.some(userRole =>
                config.admingroup.includes(userRole.id)
            );
            console.log(isAdmin, needstobeadmin)
            if (needstobeadmin === isAdmin || isAdmin) {
               
                await interaction.channel.send(finalShortcutValue);
                // make the interaction done
                await interaction.reply({
                    content: "Shortcut executed successfully.",
                    ephemeral: true
                });
            }else{
                await interaction.reply({
                    content: "You don't have permission to use this shortcut.",
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error("Error handling /shortcut command:", error);
            await interaction.reply({
                content: "An error occurred while processing the command. Please try again.",
                ephemeral: true
            });
        }
    },
};



