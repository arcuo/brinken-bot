import { getBirthdayPeople, buildBirthdayChannelName } from "./utils.js";
import { DateTime } from "luxon";
import * as globals from "../globals.js";
import { ChannelType, OverwriteType, PermissionsBitField } from "discord.js";

export async function handleWeekBeforeBirthday(
	targetBirthdayMMDD,
	channelNameSuffix = "",
) {
	const { birthdayPeople, sortedBirthdays, members, birthdayYear } =
		await getBirthdayPeople(targetBirthdayMMDD);

	if (birthdayPeople.length <= 0) return;

	const lowestBirthdayIndex = sortedBirthdays.findIndex(
		(x) => x.sortableBirthday === targetBirthdayMMDD,
	);
	if (lowestBirthdayIndex === -1) {
		await globals.sendMessageToChannel({
			channelId: globals.DISCORD_TEST_CHANNEL_ID,
			content:
				"'Impossible' error occurred, couldn't find birthday person after finding birthday people",
		});
		return;
	}

	let firstResponsibleIndex = lowestBirthdayIndex - 1;
	if (firstResponsibleIndex === -1) {
		firstResponsibleIndex = sortedBirthdays.length - 1;
	}

	const responsiblePeople = sortedBirthdays.filter(
		(x) =>
			x.sortableBirthday ===
			sortedBirthdays[firstResponsibleIndex].sortableBirthday,
	);

	if (responsiblePeople.length <= 0) {
		await globals.sendMessageToChannel({
			channelId: globals.DISCORD_TEST_CHANNEL_ID,
			content: `Couldn't find any responsible people for the birthday. Sorted birthdays: ${JSON.stringify(
				sortedBirthdays,
			)}`,
		});
		return;
	}

	const birthdayCelebrators = members
		.filter((m) => !birthdayPeople.map((p) => p.id).includes(m.id))
		.filter((x) => x["discord-id"]);

	const birthdayChannelName = buildBirthdayChannelName(
		birthdayPeople,
		birthdayYear,
		channelNameSuffix,
	);

	/**
	 * @type string
	 */
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
				...birthdayCelebrators.map((x) => ({
					type: OverwriteType.Member,
					id: x["discord-id"],
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
				x["discord-id"] ? `<@${x["discord-id"]}>` : `**${x.name}**`
			} der bliver ${x.nextAge} år gammel`,
	)
	.join("\n")}\n\nDe har fødselsdag om en uge ${DateTime.fromFormat(
			targetBirthdayMMDD,
			"MM-dd",
		)
			.setLocale("da-DK")
			.toFormat(
				"EEEE 'd.' dd. MMMM",
			)}, og de hovedansvarlige for fødselsdag morgenmad er:
      ${responsiblePeople.map(
				(x) =>
					`- ${x["discord-id"] ? `<@${x["discord-id"]}>` : `**${x.name}**`}`,
			)}`,
	});
}

export async function handleDayBeforeBirthday(
	targetBirthdayMMDD,
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
