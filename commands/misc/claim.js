// Deconstructing EmbedBuilder to create embeds within this command
const { EmbedBuilder, ChannelType, InteractionCollector } = require("discord.js");

module.exports = {
	name: "claim",
	// Refer to typings.d.ts for available properties.

	execute(message, args) {
        message.reply({content: `Diese Nachricht ist für dich, ${message.author}`, ephemeral:true});
    
	},
};


