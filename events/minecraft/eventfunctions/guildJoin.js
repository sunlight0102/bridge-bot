import { bot, sendToDiscord } from "../../../index.js";
import checkIfUserBlacklisted from "../../../utilities/checkIfUserBlacklisted.js";

export default {
	name: "guildJoin",
	async execute(rank, username) {
		if (!rank) {
			rank = "";
		}
		
		sendToDiscord(
			`-----------------------------------------------------\n**${rank} ${username}** joined the guild!\n-----------------------------------------------------`
		);
		// logger.info(`-----------------------------------------------------\n**${rank} ${username}** joined the guild!\n-----------------------------------------------------`)

		if (await checkIfUserBlacklisted(username)) {
			bot.chat(
				`/g kick ${username} You have been blacklisted from the guild, Mistake? --> (discord.gg/dEsfnJkQcq)`
			);
			console.log(
				"Kicking " + username + " because they are blacklisted"
			);
		}
		else {
			const welcomeMessages = [
				"Welcome to the #18 guild on Hypixel, Miscellaneous! Join the discord | discord.gg/bHFWukp",
				"Welcome to the guild! Make sure to join the discord at discord.gg/bHFWukp",
				`Welcome to the guild, ${username}! Join the discord at discord.gg/bHFWukp`,
				`Welcome to the guild, ${username}! Interact with the community more at discord.gg/bHFWukp`,
			];

			setTimeout(() => {
				bot.chat(
					welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)]
				);
			}, 3000);
		}
	},
};
