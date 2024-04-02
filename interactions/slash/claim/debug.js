const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const axios = require("axios");
const mysql = require("mysql2/promise");
const path = require("path");

// Get the current directory of the script
const currentDir = __dirname;

// Construct the path to config.json in the root folder
const configPath = path.join(currentDir, "../../../config.json");
let config; // Declare config outside the try block

try {
    // Load the configuration from the JSON file or wherever you get it
    const rawconfig = fs.readFileSync(configPath);
    config = JSON.parse(rawconfig);

    // Create dbconfig based on the loaded configuration
    dbConfig = {
        host: config.mysqlip,
        user: config.mysqlusername,
        password: config.mysqlpassword,
        database: config.databasename,
    };

    // Rest of the code using dbConfig...
} catch (error) {
    console.error("Error reading or parsing config.json:", error.message);
    process.exit(1); // Exit the process if config is not valid
}

const pool = mysql.createPool(dbConfig);





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

// Function to fetch package names using Tebex API
async function fetchPackageNames() {
    try {
        const headers = {
            "X-Tebex-Secret": config.tebexSecret,
        };

        const response = await axios.get(
            "https://plugin.tebex.io/packages",
            { headers }
        );

        if (response.status === 200) {
            const packages = response.data;
            const packageNames = packages.map(pkg => pkg.name);
            return packageNames;
        } else {
            console.error("Failed to fetch package names. Tebex API returned an error:", response.statusText);
            return [];
        }
    } catch (error) {
        console.error("Error fetching package names:", error);
        return [];
    }
}




async function fetchPackageNamesid(tbxId) {
    const [tebexIdExists, tbxData, keymastername] = await doesTebexIdExist(
        config.tebexSecret,
        tbxId
    );
    let packageNames = "NOT FOUND";
    if(tebexIdExists){
        // make a string that contains each entry of tbxData.packages separated by a space and a comma
        if (tbxData && tbxData.packages && tbxData.packages.length > 0) {
            packageNames = tbxData.packages.map(package => package.name).join(', ');
        }
    }
    return packageNames;
}

async function fetchMySQLData(){
    try {
        const [rows] = await pool.query(
            `SELECT * FROM \`${config.tableName}\` ORDER BY id DESC LIMIT 30`
        );

        return rows;
    } catch (error) {
        console.error("Error fetching MySQL data:", error);
        return [];
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("debug")
        .setDescription("Debug information")
        .addStringOption(option =>
            option.setName("option")
                .setDescription("Choose an option")
                .setRequired(true)
                .addChoices(
                    { name: 'Packages', value: 'packages' },
                    { name: 'MySQL', value: 'mysql' },
                    { name: 'User', value: 'user' },
                    { name: "keymastername", value: "keymastername"},
                    { name: "tbx-id", value: "tbx-id"}
                ))
        .addUserOption(option =>
            option.setName("selected_user")
                .setDescription("Select a user")
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName("keymastername")
                .setDescription("Enter the keymaster name")
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName("tbx-id")
                .setDescription("Enter the Tebex ID")
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            // Check if the user is an admin
            const isAdmin = interaction.member.roles.cache.some(userRole =>
                config.admingroup.includes(userRole.id)
            );

            if (!isAdmin) {
                await interaction.reply({
                    content: "You do not have permission to use this command.",
                    ephemeral: true
                });
                return;
            }

            // Get the chosen option
            const option = interaction.options.getString("option");

            switch (option.toLowerCase()) {
                case "packages":
                    // Fetch and list all package names
                    const packageNames = await fetchPackageNames();

                    await interaction.reply({
                        content: `Available Packages:\n${packageNames.join("\n")}`,
                        ephemeral: true
                    });
                    break;
                case "mysql":
                    // Fetch MySQL data (limit to 30 last entries)
                    const mysqlData = await fetchMySQLData();

                    // make the mysqldata for each row in mysqlData a codeblock

                    let newmysqldata = mysqlData.map(row => { return `\`\`\` ID: ${row.id} Discord ID: ${row.discordid} Developer Discord ID: ${row.developerdiscordid} Tebex ID: ${row.tbxid} Keymaster Name: ${row.keymastername} \`\`\``; }).join("\n");



                    await interaction.reply({
                        content: `MySQL Data:${newmysqldata}`,
                        ephemeral: true
                    });
                    break;
                    case "user":
                            // Get the selected user
                            const selectedUser = interaction.options.getUser("selected_user");
                        
                            // Check if selectedUser is valid
                            if (!selectedUser || !selectedUser.id) {
                                await interaction.reply({
                                    content: "Invalid user selection.",
                                    ephemeral: true
                                });
                                return;
                            }
                        
                            try {
                                // Fetch user information from the database
                                const [userData] = await pool.query(
                                    `SELECT * FROM \`${config.tableName}\` WHERE discordid = ? OR developerdiscordid = ?`,
                                    [selectedUser.id, selectedUser.id]
                                );
                        
                                let userOutput = "User Data:\n";
                                if (userData.length > 0) {
                                    userData.forEach(row => {
                                        userOutput += `\`\`\`
                        ID: ${row.id}
                        Discord ID: ${row.discordid}
                        Developer Discord ID: ${row.developerdiscordid}
                        Tebex ID: ${row.tbxid}
                        Keymaster Name: ${row.keymastername}
                        \`\`\`\n`;
                                    });
                                } else {
                                    userOutput += "No data found for the selected user.";
                                }
                        
                                // Check if the user executing the command is an admin
                                const isAdmin = interaction.member.roles.cache.some(userRole =>
                                    config.admingroup.includes(userRole.id)
                                );
                        
                                let adminStatus = isAdmin ? "is an admin" : "is not an admin";
                        
                                await interaction.reply({
                                    content: `${userOutput}\nUser ${selectedUser.username} ${adminStatus}`,
                                    ephemeral: true
                                });
                            } catch (error) {
                                console.error("Error fetching user information:", error);
                                await interaction.reply({
                                    content: "An error occurred while fetching user information.",
                                    ephemeral: true
                                });
                            }                        
                    break;
                    case "keymastername":
                        const keymasterName = interaction.options.getString("keymastername");
                        try {
                            const [rows] = await pool.query(
                                `SELECT * FROM \`${config.tableName}\` WHERE keymastername = ?`,
                                [keymasterName]
                            );
                    
                            let keymasterOutput = "Keymaster Data:\n";
                            if (rows.length > 0) {
                                rows.forEach(row => {
                                    keymasterOutput += `\`\`\`
                    ID: ${row.id}
                    Discord ID: ${row.discordid}
                    Developer Discord ID: ${row.developerdiscordid}
                    Tebex ID: ${row.tbxid}
                    Keymaster Name: ${row.keymastername}
                    \`\`\`\n`;
                                });
                            } else {
                                keymasterOutput = "No data found for the selected keymaster.";
                            }
                    
                            await interaction.reply({ content: keymasterOutput, ephemeral: true });
                        } catch (error) {
                            console.error("Error fetching keymaster information:", error);
                            await interaction.reply({ content: "An error occurred while fetching keymaster information.", ephemeral: true });
                        }
                        break;
                    
                        case "tbx-id":
                            const tbxId = interaction.options.getString("tbx-id");
                            try {
                                const [rows] = await pool.query(
                                    `SELECT * FROM \`${config.tableName}\` WHERE tbxid = ?`,
                                    [tbxId]
                                );
                        
                                let tbxOutput = `Tebex Data for TBX ID '${tbxId}':\n`;
                                console.log(rows.length)
                                if (rows.length > 0) {
                                    rows.forEach(async (row) => {
                                        // Fetch package names bound to the specified Tebex ID
                                        tbxOutput += `\`\`\`
                                            ID: ${row.id}
                                            Discord ID: ${row.discordid}
                                            Developer Discord ID: ${row.developerdiscordid}
                                            Tebex ID: ${row.tbxid}
                                            Keymaster Name: ${row.keymastername}
                                        \`\`\`\n`;
                                    });
                                } else {
                                    tbxOutput = `No data found for the selected Tebex ID '${tbxId}'.`;
                                }
                                // add the packages at the bottom of tbxOutput
                                const packageNames = await fetchPackageNamesid(tbxId);
                                tbxOutput += `\nPackage/s: ${packageNames}`;
                                await interaction.reply({ content: tbxOutput, ephemeral: true });

                              
                               
                            } catch (error) {
                                console.error("Error fetching Tebex information:", error);
                                await interaction.reply({ content: "An error occurred while fetching Tebex information.", ephemeral: true });
                            }                        
                        break;                    
                default:
                    await interaction.reply({
                        content: "Invalid option.",
                        ephemeral: true
                    });
                    break;
            }
        } catch (error) {
            console.error("Error handling /debug command:", error);
            await interaction.reply({
                content: "An error occurred while processing the command.",
                ephemeral: true
            });
        }
    },
};

