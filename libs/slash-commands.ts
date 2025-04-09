import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import {
	cacheInteraction,
	DISCORD_TEST_CHANNEL_ID,
	getMoreButtons,
	sendMessageToChannel,
} from "./globals.js";

export const slashCommands = [
	{
		data: new SlashCommandBuilder()
			.setName("brinken-bot")
			.setDescription(
				"Se alle mulige handlinger og informationer Brinken Botten tilbyder dig",
			),
		async execute(interaction: ChatInputCommandInteraction) {
			await interaction.reply({
				content:
					"Hej! Her er alle de handlinger og informationer jeg kan tilbyde dig!",
				components: [...getMoreButtons("none")],
			});

			const reply = await interaction.fetchReply();

			cacheInteraction({
				timestamp: reply.createdTimestamp,
				interaction,
				messageId: reply.id,
			});
		},
	},
];

export async function handleSlashCommand(
	interaction: ChatInputCommandInteraction,
) {
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		await sendMessageToChannel({
			channelId: DISCORD_TEST_CHANNEL_ID,
			content: `Command not found: ${interaction.commandName}`,
		});
		return;
	}

	try {
		await command.execute(interaction);
	} catch (e) {
		const errorMessage = e instanceof Error ? e.stack : JSON.stringify(e);
		await sendMessageToChannel({
			channelId: DISCORD_TEST_CHANNEL_ID,
			content: `Error occurred during command execution: ${errorMessage}`,
		});
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({
				content: "There was an error while executing this command!",
			});
		} else {
			await interaction.reply({
				content: "There was an error while executing this command!",
			});
		}
	}
}
