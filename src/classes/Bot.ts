import { BotEvents, createBot } from "mineflayer";
import { ColorResolvable, Intents, MessageEmbed, TextChannel } from "discord.js";
import { Command } from "../interfaces/Command";
import Discord from "./Client";
import { Event } from "../interfaces/Event";
import EventEmitter from "events";
import consola from "consola";
import isObjKey from "../util/isObjKey";
import logError from "../util/logError";
import path from "path";
import recursiveWalkDir from "../util/recursiveWalkDir";
import regex from "../util/regex";

class Bot {
	public readonly logger = consola;

	public readonly discord = new Discord({
		allowedMentions: { parse: ["users", "roles"], repliedUser: true },
		intents: [Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS],
	});
	public readonly botPrefix = process.env.DISCORD_PREFIX ?? ")";
	public readonly chatSeparator = process.env.MINECRAFT_CHAT_SEPARATOR ?? ">";
	public memberChannel?: TextChannel;
	public officerChannel?: TextChannel;

	public onlineCount = 0;
	public totalCount = 125;
	public readonly mineflayer = createBot({
		username: process.env.MINECRAFT_EMAIL,
		password: process.env.MINECRAFT_PASSWORD,
		host: "mc.hypixel.net",
		version: "1.16.4",
		logErrors: true,
		hideErrors: true,
		auth: process.env.MINECRAFT_AUTH_TYPE,
		checkTimeoutInterval: 30000,
		defaultChatPatterns: false,
	});

	constructor() {
		try {
			this.start();
		} catch (error) {
			this.logger.error(error);
		}
	}

	public async sendToDiscord(
		channel: "gc" | "oc",
		content: string,
		color: ColorResolvable = 0x2f3136,
		padMessage: boolean = false,
	) {
		const embed = new MessageEmbed()
			.setDescription(padMessage ? `${"-".repeat(54)}\n${content}\n${"-".repeat(54)}` : content)
			.setColor(color);

		channel === "gc"
			? await this.memberChannel?.send({ embeds: [embed] })
			: await this.officerChannel?.send({ embeds: [embed] });
	}

	public async sendGuildMessage(channel: "gc" | "oc", message: string) {
		await this.executeCommand(`/${channel} ${message}`);
	}

	public async executeCommand(message: string) {
		this.mineflayer.chat(message);
	}

	public async executeTask(task: string) {
		let listener: BotEvents["message"];

		await new Promise((_resolve, reject) => {
			this.mineflayer.chat(task);
			this.mineflayer.on("message", (message) => {
				const motd = message.toMotd();
				const match = motd.match(/^(.+)§c(.+)§r$/) ?? motd.match(/^§c(.+)§r$/);

				match?.forEach((line) => {
					if (line.includes("§") || line.includes("limbo")) return;
					if (line.includes("is not in your guild!")) return reject(`That player ${line}`);
					reject(line);
				});
			});

			const messageListeners = this.mineflayer.listeners("message");
			listener = messageListeners[messageListeners.length - 1] as BotEvents["message"];
		}).finally(() => {
			this.mineflayer.removeListener("message", listener);
		});
	}

	public async sendToLimbo() {
		for (let i = 0; i < 12; i++) await this.executeCommand("/");
	}

	public async setStatus() {
		const plural = this.onlineCount - 1 !== 1;
		if (this.discord.isReady()) {
			this.discord.user.setActivity(`${this.onlineCount} online player${plural ? "s" : ""}`, {
				type: "WATCHING",
			});
		}
	}

	private async loadCommands(dir: string) {
		const callback = async (currentDir: string, file: string) => {
			if (!(file.endsWith(".ts") || file.endsWith(".js")) || file.endsWith(".d.ts")) return;

			const command = (await import(path.join(currentDir, file))).default as Command;

			if (!command.data) {
				return console.warn(`The command ${path.join(currentDir, file)} doesn't have a name!`);
			}

			if (!command.run) {
				return console.warn(`The command ${command.data.name} doesn't have an executable function!`);
			}

			this.discord.commands.set(command.data.name, command);
		};

		await recursiveWalkDir(path.join(__dirname, dir), callback, "Error while loading commands: ");
	}

	private async loadEvents(dir: string, emitter: EventEmitter) {
		const callback = async (currentDir: string, file: string) => {
			if (!(file.endsWith(".ts") || file.endsWith(".js")) || file.endsWith(".d.ts")) return;

			const { name, runOnce, run } = (await import(path.join(currentDir, file))).default as Event;

			if (!name) {
				return console.warn(`The event ${path.join(currentDir, file)} doesn't have a name!`);
			}

			if (!run) {
				return console.warn(`The event ${name} doesn't have an executable function!`);
			}

			if (isObjKey(name, regex)) {
				this.mineflayer.addChatPattern(name.replace("chat:", ""), regex[name], {
					repeat: true,
					parse: true,
				});
			}

			if (runOnce) {
				emitter.once(name, run.bind(null, this));
				return;
			}

			emitter.on(name, (...args) => {
				if (isObjKey(name, regex)) {
					args = args[0][0];
				}
				run(this, ...args);
			});
		};

		await recursiveWalkDir(path.join(__dirname, dir), callback, "Error while loading events: ");
	}

	private async start() {
		this.mineflayer.setMaxListeners(20);
		await this.loadCommands("../commands");

		await this.loadEvents("../events/discord", this.discord);
		await this.loadEvents("../events/mineflayer", this.mineflayer);

		await this.discord.login(process.env.DISCORD_TOKEN);
	}
}

process.on("uncaughtException", logError).on("unhandledRejection", logError);

export default Bot;
