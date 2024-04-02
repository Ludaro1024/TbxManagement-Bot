const fs = require("fs");
const path = require("path");
const { MessageActionRow, MessageButton } = require("discord.js");

const configPath = path.join(__dirname, "../../config.json");
let config;

try {
	const rawConfig = fs.readFileSync(configPath);
	config = JSON.parse(rawConfig);
} catch (error) {
	console.error("Error reading or parsing config.json:", error.message);
}

const muteDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
const blacklistDuration = 2 * 60 * 1000; // 2 minutes in milliseconds

const tempLinkRecords = {};
const blacklist = {};

// ... (previous code)

module.exports = {
	name: ["http://", "https://"],

	async execute(message, args) {
		// Check if the message has any links
  const isAdmin = message.member.roles.cache.some(userRole =>
                config.admingroup.includes(userRole.id)
            );

			if(isAdmin != true){
			console.log("isAdmin is false")

		const links = message.content.match(/https?:\/\/\S+/gi);

		if (links && links.length > 0) {
			const userId = message.author.id;

			// Check if the user is on the blacklist
			if (blacklist[userId]) {
				console.log("User is on the blacklist");

				// Check if the warning message has been sent
				if (!blacklist[userId].warningSent) {
					const timeLeft =
						blacklist[userId].timestamp + blacklistDuration - Date.now();
					const minutesLeft = Math.ceil(timeLeft / 60000);
					const secondsLeft = Math.ceil((timeLeft % 60000) / 1000);
					const timeLeftString = `${minutesLeft} minutes and ${secondsLeft} seconds`;

					// Send the warning message to the user
					message.channel.send(
						`You are on the blacklist for posting duplicate links. Please wait ${timeLeftString} before posting again. (<@${userId}>)`
					);

					// Set warningSent to true to indicate the warning has been sent
					blacklist[userId].warningSent = true;
				}

				// Delete the user's message
				message.delete();
				return;
			}

			// Log when a link is found
			console.log("Found a link");

			// Check if the user has one of the admin roles
			const hasAdminRole = false;

			// Check if the user has posted the same link twice
			const duplicateLinks = getDuplicateLinks(
				message,
				userId,
				links,
				hasAdminRole
			);

			// Log how many links of the user have been found
			console.log(
				`Duplicate links found for user ${userId}: ${duplicateLinks.length}`
			);

			if (!hasAdminRole && duplicateLinks.length > 0) {
				// Log when a duplicate link is found for a non-admin user
				console.log("Duplicate links found for a non-admin user");

				// Add the user to the blacklist
				addToBlacklist(userId);

				// Remove the user from the blacklist after 2 minutes
				setTimeout(() => removeFromBlacklist(userId), blacklistDuration);

				// Delete all messages with duplicate links by the same user
				deleteMessagesWithDuplicateLinks(message, userId, duplicateLinks);
			} else if (hasAdminRole && duplicateLinks.length > 0) {
				// Log when a duplicate link is found for an admin user
				console.log("Duplicate links found for an admin user");
			}
		}
	}
}
};

function checkUserAdminRole(member) {
	return config.admingroup.some((roleId) => member.roles.cache.has(roleId));
}

function getDuplicateLinks(message, userId, links, hasAdminRole) {
	const userLinkRecords = tempLinkRecords[userId] || [];
	const currentTimestamp = Date.now();

	const updatedLinkRecords = userLinkRecords.filter(
		(record) => currentTimestamp - record.timestamp < 120000
	);

	for (const link of links) {
		updatedLinkRecords.push({ link, timestamp: currentTimestamp });
	}

	tempLinkRecords[userId] = updatedLinkRecords;

	if (updatedLinkRecords.length > 2) {
		console.log("trying to delete!");
		deleteMessagesWithDuplicateLinks(
			message,
			updatedLinkRecords.map((record) => record.link)
		);
	}

	return updatedLinkRecords
		.filter(
			(record) =>
				updatedLinkRecords.filter((r) => r.link === record.link).length > 1
		)
		.map((record) => record.link);
}

async function deleteMessagesWithDuplicateLinks(
	message,
	userId,
	duplicateLinks
) {
	const channels = message.guild.channels.cache;

	channels.forEach(async (channel) => {
		if (channel.type === 0) {
			try {
				const messages = await channel.messages.fetch({ limit: 100 });
				messages.forEach(async (msg) => {
					if (
						msg.author.id === userId &&
						duplicateLinks.some((link) => msg.content.includes(link))
					) {
						try {
							await msg.delete();
							console.log(
								`Deleted message in channel ${channel.id} with content: ${msg.content}`
							);
						} catch (deleteError) {
							console.error(
								`Error deleting message in channel ${channel.id}: ${deleteError.message}`
							);
						}
					}
				});
			} catch (fetchError) {
				console.error(
					`Error fetching messages in channel ${channel.id}: ${fetchError.message}`
				);
			}
		}
	});
}

function addToBlacklist(userId) {
	blacklist[userId] = { timestamp: Date.now() };
	console.log(`Added user ${userId} to the blacklist.`);
}

function removeFromBlacklist(userId) {
	delete blacklist[userId];
	console.log(`Removed user ${userId} from the blacklist.`);
}

