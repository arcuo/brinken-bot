import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type Interaction,
} from "discord.js";
import { slashCommands, handleSlashCommand } from "./slash-commands.js";
import {
	Client,
	Collection,
	Events,
	GatewayIntentBits,
	TextChannel,
} from "discord.js";
import { birthdayActionListeners } from "./birthday/actions.js";
import { dinnerActionListeners } from "./dinner/actions.js";
import { stringifyDiscordClass } from "./utils.js";

export const DISCORD_GUILD_ID = "1276132880552034446";
export const DISCORD_TEST_CHANNEL_ID = "1289988414476779671";
export const DISCORD_TEST_CHANNEL_NAME = "brinkenbot-test";
export const DISCORD_CLIENT_ID = "1289978773764309112";

export const discordClient = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
}) as Client;

const commands = new Collection();

// biome-ignore lint/complexity/noForEach: <explanation>
slashCommands.forEach((command) => {
	commands.set(command.data.name, command);
});

discordClient.on(Events.InteractionCreate, async (interaction) => {
	if (interaction.isChatInputCommand()) await handleSlashCommand(interaction);
	else if (interaction.isButton()) await handleButtonInteraction(interaction);
	else {
		sendMessageToChannel({
			channelId: DISCORD_TEST_CHANNEL_ID,
			content: `Unknown interaction received: ${JSON.stringify(interaction)}`,
		});
	}
});

await new Promise((resolve) => {
	discordClient.once(Events.ClientReady, async (readyClient) => {
		resolve(readyClient);
	});
	discordClient.login(process.env.DISCORD_BOT_TOKEN);
});

if (!discordClient.isReady()) {
	throw new Error("discord client wasn't ready when expected to be");
}

/**
 * @param {object} obj
 * @param {string} obj.channelId
 * @param {string} obj.message
 * @param {import("discord.js").BaseMessageOptions["components"]} obj.components
 */
export async function sendMessageToChannel({
	channelId,
	content,
}: {
	channelId: string;
	content: Parameters<TextChannel["send"]>[0];
}) {
	const channel = await discordClient.channels.fetch(channelId);
	if (!(channel instanceof TextChannel)) {
		throw new Error(`Channel is not a text channel: ${channelId}`);
	}
	return channel.send(content);
}

async function handleButtonInteraction(interaction) {
	const [actionId, actionValue] = interaction.customId.split("*");

	const allListeners = globalActionListeners
		.concat(dinnerActionListeners)
		.concat(birthdayActionListeners);

	const handler = allListeners.find(({ id }) => id === actionId)?.action;

	if (handler === undefined) {
		await interaction.reply({
			content: "Unkown button interaction received",
		});
		await sendMessageToChannel({
			channelId: DISCORD_TEST_CHANNEL_ID,
			content: `Unknown button interaction received: ${stringifyDiscordClass(
				interaction,
			)}`,
		});
		return;
	}

	try {
		await handler({ interaction, actionValue });
	} catch (e) {
		const errorMessage = e instanceof Error ? e.stack : JSON.stringify(e);
		await sendMessageToChannel({
			channelId: DISCORD_TEST_CHANNEL_ID,
			content: `Error occurred during button interaction: ${errorMessage}, and the interaction was: ${stringifyDiscordClass(
				interaction,
			)}`,
		});
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({
				content: "There was an error while executing this button interaction!",
			});
		} else {
			await interaction.reply({
				content: "There was an error while executing this button interaction!",
			});
		}
	}
}

export const RUNNING_IN_PRODUCTION = process.env.MODE !== "development";
console.log("RUNNING_IN_PRODUCTION:", RUNNING_IN_PRODUCTION);

export const MUMSDAG_CHANNEL_ID = RUNNING_IN_PRODUCTION
	? "1325490174909612124"
	: DISCORD_TEST_CHANNEL_ID;
export const GENERAL_CHANNEL_ID = RUNNING_IN_PRODUCTION
	? "1276132881000828939"
	: DISCORD_TEST_CHANNEL_ID;
export const THIS_BOT_USER_ID = "1289978773764309112";

export const deleteMessageActionId = "delete-message";

export type Action = (params: {
	interaction: Interaction;
	actionValue: string;
}) => Promise<void>;
export type ActionListeners = { id: string; action: Action }[];
export const globalActionListeners: ActionListeners = [
	{
		id: deleteMessageActionId,
		action: async ({ interaction }) => {
			if (!interaction.isButton()) return;
			if (interaction.message.interactionMetadata) {
				const oldInteraction = getInteraction(interaction.message.id);
				if (isInteractionValid(interaction.message.id) && oldInteraction) {
					await interaction.deferUpdate();
					await oldInteraction.deleteReply();
					return;
				}
				await interaction.reply({
					content:
						"Discord tillader kun for mig at slette beskeder for dig indenfor 15 minutter af at de er blevet sendt, så du bliver desværre nødt til at håndtere den her selv. Lige under beskeden skulle der gerne stå at kun du kan se beskeden, og så et link der lader dig fjerne beskeden",
				});
				return;
			}
			await interaction.deferUpdate();
			await interaction.message.delete();
		},
	},
	{
		id: "see-more-actions",
		action: async ({ interaction, actionValue }) => {
			if (!interaction.isRepliable()) return;
			await interaction.reply({
				content: "Flere handlinger",
				components: [
					...getMoreButtons(actionValue),
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setLabel("Skjul besked")
							.setStyle(ButtonStyle.Danger)
							.setCustomId(deleteMessageActionId),
					),
				],
			});
		},
	},
];

/**
 * @type {import("discord.js").ButtonBuilder[]}
 */
const dinnerButtons = [
	new ButtonBuilder()
		.setCustomId("see-dinner-schedule")
		.setLabel("Se skema")
		.setStyle(ButtonStyle.Primary),
	new ButtonBuilder()
		.setCustomId("edit-dinner-schedule")
		.setLabel("Ret skema")
		.setStyle(ButtonStyle.Primary),
];

/**
 * @param {string} message
 */
export function sendDinnerMessage(message) {
	return sendMessageToChannel({
		channelId: MUMSDAG_CHANNEL_ID,
		content: {
			body: message,
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					...dinnerButtons,
					getSeeMoreActionsButton("dinner"),
				),
			],
		},
	});
}

const birthdayButtons = [
	new ButtonBuilder()
		.setCustomId("see-birthday-schedule")
		.setLabel("Se alle fødselsdage")
		.setStyle(ButtonStyle.Primary),
];

/**
 * @param {object} obj
 * @param {string} obj.message
 * @param {string} obj.channelId
 */
export function sendBirthdayMessage({ message, channelId }) {
	return sendMessageToChannel({
		channelId,
		content: {
			body: message,
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					...birthdayButtons,
					getSeeMoreActionsButton("birthday"),
				),
			],
		},
	});
}

const generalButtons = [
	new ButtonBuilder()
		.setStyle(ButtonStyle.Link)
		.setLabel("Husmøde Referater")
		.setURL(
			"https://docs.google.com/document/d/1Q0PkXL5DTkijfkU9Z7zHdvwEIDCJI2mdhUu-jbBo3ZE/edit?usp=sharing",
		),
	new ButtonBuilder()
		.setStyle(ButtonStyle.Link)
		.setLabel("Indflytter Guide")
		.setURL(
			"https://docs.google.com/document/d/1pVYvivttl5awFSU2ha6KtNyPEXF5Ws4zETgb1r0M3OE/edit?usp=sharing",
		),
];

/**
 * @param {string} message
 */
export function sendGeneralMessage(message) {
	return sendMessageToChannel({
		channelId: GENERAL_CHANNEL_ID,
		content: {
			body: message,
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					...generalButtons,
					getSeeMoreActionsButton("general"),
				),
			],
		},
	});
}

/**
 * @param {'dinner' | 'birthday' | 'general'} type
 */
function getSeeMoreActionsButton(type) {
	return new ButtonBuilder()
		.setCustomId(`see-more-actions*${type}`)
		.setLabel("Se flere handlinger")
		.setStyle(ButtonStyle.Secondary);
}

/**
 * @param {'dinner' | 'birthday' | 'general' | 'none'} exclude
 * @returns {ActionRowBuilder[]}
 */
export function getMoreButtons(exclude) {
	const ret: ActionRowBuilder<ButtonBuilder>[] = [];
	if (exclude !== "general") {
		ret.push(
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setLabel("Generelle Handlinger:")
					.setStyle(ButtonStyle.Secondary)
					.setCustomId("title-general")
					.setDisabled(true),
				...generalButtons,
			),
		);
	}
	if (exclude !== "dinner") {
		ret.push(
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setLabel("Mumsdag Handlinger:")
					.setStyle(ButtonStyle.Secondary)
					.setCustomId("title-dinner")
					.setDisabled(true),
				...dinnerButtons,
			),
		);
	}
	if (exclude !== "birthday") {
		ret.push(
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setLabel("Fødselsdag Handlinger:")
					.setStyle(ButtonStyle.Secondary)
					.setCustomId("title-birthday")
					.setDisabled(true),
				...birthdayButtons,
			),
		);
	}
	if (exclude === "none") {
		ret.push(
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(deleteMessageActionId)
					.setLabel("Skjul besked")
					.setStyle(ButtonStyle.Danger),
			),
		);
	}
	return ret;
}

const interactionCache = new Map();

export function isInteractionValid(messageId) {
	const timestamp = interactionCache.get(messageId)?.[0];
	if (!timestamp) {
		return false;
	}
	return Date.now() - timestamp < 15 * 60 * 1000 - 1000;
}

export function getInteraction(messageId) {
	return interactionCache.get(messageId)?.[1];
}

export function cacheInteraction({ timestamp, interaction, messageId }) {
	interactionCache.set(messageId, [timestamp, interaction]);
}

export function clearOutdatedInteractionsInCache() {
	interactionCache.forEach((_, messageId) => {
		if (!isInteractionValid(messageId)) {
			if (!interactionCache.delete(messageId)) {
				sendMessageToChannel({
					channelId: DISCORD_TEST_CHANNEL_ID,
					content: `Failed to delete outdated interaction from cache. Message id: ${messageId}`,
				}).catch(console.error);
			}
		}
	});
}
