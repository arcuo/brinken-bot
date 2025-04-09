import { getBirthdayPeople, buildBirthdayChannelName } from "./utils.js";
import { DateTime } from "luxon";
import * as globals from "../globals.js";
import { ChannelType, OverwriteType, PermissionsBitField } from "discord.js";

export async function handleWeekBeforeBirthday(
	targetBirthdayMMDD: string,
	channelNameSuffix = "",
) {
	const { birthdayPeople, birthdayYear, birthdayResponsible } =
		await getBirthdayPeople(targetBirthdayMMDD);

	const birthdayChannelName = buildBirthdayChannelName(
		birthdayPeople,
		birthdayYear,
		channelNameSuffix,
	);

	let birthdayChannelId = globals.DISCORD_TEST_CHANNEL_ID;

	if (globals.RUNNING_IN_PRODUCTION) {
		const guild = await globals.discordClient.guilds.fetch(
			globals.DISCORD_GUILD_ID,
		);
		await guild.members.fetch();
		const channel = await guild.channels.create({
			type: ChannelType.GuildText,
			name: birthdayChannelName,
			permissionOverwrites: [
				...birthdayPeople.map((x) => ({
					type: OverwriteType.Member,
					id: x.discordId,
					allow: [PermissionsBitField.Flags.ViewChannel],
				})),
				{
					type: OverwriteType.Member,
					id: globals.THIS_BOT_USER_ID,
					allow: [PermissionsBitField.Flags.ViewChannel],
				},
				{
					type: OverwriteType.Role,
					id: guild.roles.everyone.id,
					deny: [PermissionsBitField.Flags.ViewChannel],
				},
			],
		});
		birthdayChannelId = channel.id;
	}

	await globals.sendBirthdayMessage({
		channelId: birthdayChannelId,
		message: `# :flag_dk: :flag_dk: :flag_dk: Der er fødselsdag i kollektivet! :flag_dk: :flag_dk: :flag_dk:

Så blev det fødselsdagstid igen! Denne gang har vi:

${birthdayPeople
	.map(
		(x) =>
			`- ${
				x.discordId ? `<@${x.discordId}>` : `**${x.name}**`
			} der bliver ${x.nextAge} år gammel`,
	)
	.join("\n")}\n\nDe har fødselsdag om en uge ${DateTime.fromFormat(
			targetBirthdayMMDD,
			"MM-dd",
		)
			.setLocale("da-DK")
			.toFormat(
				"EEEE 'd.' dd. MMMM",
			)}, og den hovedansvarlige for fødselsdag morgenmad er: - ${birthdayResponsible.discordId ? `<@${birthdayResponsible.discordId}>` : `**${birthdayResponsible.name}**`}`,
	});
}

export async function handleDayBeforeBirthday(
	targetBirthdayMMDD: string,
	channelNameOverride = null,
) {
	let birthdayChannelName: string;
	if (channelNameOverride !== null) {
		birthdayChannelName = channelNameOverride;
	} else {
		const { birthdayPeople, birthdayYear } =
			await getBirthdayPeople(targetBirthdayMMDD);
		if (birthdayPeople.length <= 0) return;

		birthdayChannelName = buildBirthdayChannelName(
			birthdayPeople,
			birthdayYear,
		);
	}

	const guild = await globals.discordClient.guilds.fetch(
		globals.DISCORD_GUILD_ID,
	);
	const channels = await guild.channels.fetch();
	const channel = channels.find(
		(channel) => channel?.name === birthdayChannelName,
	);

	if (!channel) {
		await globals.sendMessageToChannel({
			channelId: globals.DISCORD_TEST_CHANNEL_ID,
			content: `Couldn't find the channel with name ${birthdayChannelName}`,
		});
		return;
	}

	await globals.sendBirthdayMessage({
		channelId: channel.id,
		message: `# Fødselsdag i morgen!

@everyone`,
	});
}
