import Emojis from "../../../util/emojis";
import { Event } from "../../../interfaces/Event";
import { Util } from "discord.js";

export default {
	name: "chat:promoteDemote",
	runOnce: false,
	run: async (
		bot,
		hypixelRank: string | undefined,
		playerName: string,
		type: "promoted" | "demoted",
		guildRankFrom: string,
		guildRankTo: string,
	) => {
		await bot.sendToDiscord(
			"gc",
			`${Emojis.guildEvent} ${hypixelRank ?? ""}${Util.escapeMarkdown(
				playerName,
			)} was ${type} to ${guildRankTo} from ${guildRankFrom}!`,
			undefined,
			true,
		);
	},
} as Event;
