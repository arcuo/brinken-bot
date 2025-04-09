import { stringNaturalLanguageList } from "../utils.js";
import {
	MUMSDAG_CHANNEL_ID,
	THIS_BOT_USER_ID,
	sendDinnerMessage,
	RUNNING_IN_PRODUCTION,
	sendGeneralMessage,
	discordClient,
	DISCORD_GUILD_ID,
} from "../globals.js";
import type { DateTime } from "luxon";
import { TextChannel } from "discord.js";
import { dbclient } from "../db.js";

export async function handleThreeDaysBeforeDinner(
	onsdagLuxonDateTime: DateTime,
) {
	// Check if wednesday
	if (onsdagLuxonDateTime.weekday !== 3) {
		return;
	}

	// Check if we have a new pairing
	if (RUNNING_IN_PRODUCTION) {
		const maxDateRow = await dbclient.getLastMumsdag();
		if (
			maxDateRow &&
			maxDateRow.date >
				onsdagLuxonDateTime.plus({ months: 3 }).toFormat("yyyy-MM-dd")
		) {
			const curDate = await dbclient.addNewMumsdagPairings(maxDateRow.date);

			await sendGeneralMessage(
				`# Ny madlavningsplan!

Der er nu madlavningsplan indtil ${curDate
					.setLocale("da-DK")
					.toFormat(
						"'d.' dd. MMMM yyyy",
					)} da vi var tre måneder fra at være færdige med den gamle. Du kan se planen ved at trykke på se flere handlinger.`,
			);
		}

		// for (const x of allDinnerRows) {
		// 	if (x.date < onsdagLuxonDateTime.toFormat("yyyy-MM-dd")) {
		// 		await dbclient.archiveMumsdag(x.date);
		// 	}
		// }
	}

	const dbRow = await dbclient.getMumsdag({
		date: onsdagLuxonDateTime.toFormat("yyyy-MM-dd"),
	});

	if (!dbRow) return;

	const headChef = await dbclient.getBeboerById(dbRow.mainChefId);
	const assistent = await dbclient.getBeboerById(dbRow.sousChefId);

	const msgLines = [
		"# Mumsdag",
		"",
		"Så er der endnu engang tre dage til mumsdag! I denne uge har vi:",
		`- :cook: **Head Chef:** ${
			headChef.discordId ? `<@${headChef.discordId}>` : `**${headChef.name}**`
		}`,
		`- :cook: **Souschef:** ${
			assistent.discordId
				? `<@${assistent.discordId}>`
				: `**${assistent.name}**`
		}`,
		"## Svar Udbedes",
		"På denne besked må i meget gerne lave en emoji reaktion for at tilkendegive om i tænker i spiser med på onsdag. Det er fint at ændre den senere men prøv så godt du kan at have et endeligt svar på senest onsdag morgen:",
		"- :white_check_mark:: Ja",
		"- :x:: Nej",
		"- <a:yes_no_may_be_so_blob:1290015813608144956>: Stadig usikker/Måske",
		"",
		"Jeg sætter også hver af disse emojis på beskeden nu så de er nemme at klikke, og så fjerner jeg mine egne reaktioner igen onsdag morgen så de ikke bliver talt med",
	];

	const reactionMessage = await sendDinnerMessage(msgLines.join("\n"));

	// On purpose doing it serially, it's nice for the UI that it's always the same order
	// the reactions show up in
	for (const emoji of ["✅", "❌", "1290015813608144956"]) {
		await reactionMessage.react(emoji);
	}
}

export async function handleDayOfDinner(thursdayLuxonDateTime: DateTime) {
	if (thursdayLuxonDateTime.weekday !== 3) {
		return;
	}

	const channel = await discordClient.channels.fetch(MUMSDAG_CHANNEL_ID);

	if (channel === null || !(channel instanceof TextChannel)) {
		throw new Error(`Channel not found: ${MUMSDAG_CHANNEL_ID}`);
	}

	// fetch channel messages in reverse chronological order

	const messages = await channel.messages.fetch({
		limit: 100,
	});

	/**
	 * @type {Message<true> | undefined}
	 */
	const mostRecentMessageFromUs = messages.find(
		(x) => x.author.id === THIS_BOT_USER_ID,
	);

	if (mostRecentMessageFromUs === undefined) {
		throw new Error("No message found from us to remove reactions from");
	}

	const reactions = [...mostRecentMessageFromUs.reactions.cache.values()];
	const ourReactions = reactions.filter((x) => x.me);
	await Promise.all(
		ourReactions.map((reaction) => reaction.users.remove(THIS_BOT_USER_ID)),
	);

	const usersThatHaveReacted = (
		await Promise.all(reactions.map((x) => x.users.fetch()))
	).flatMap((x) => [...x.values()]);

	const members = await dbclient.getAllBeboer();
	const guild = await discordClient.guilds.fetch(DISCORD_GUILD_ID);

	const guildUserMembers = [...(await guild.members.fetch()).values()]
		.map((x) => x.user)
		.filter((x) => members.find((y) => y.discordId === x.id) !== undefined);

	const membersThatHaventReacted = guildUserMembers.filter(
		(x) => !usersThatHaveReacted.map((y) => y.id).includes(x.id),
	);

	const maybeReaction = reactions.find(
		(x) => x.emoji.id === "1290015813608144956",
	);
	if (maybeReaction === undefined) {
		throw new Error("No maybe reaction found");
	}

	const membersWithMaybeReaction = [
		...(await maybeReaction.users.fetch()).values(),
	].filter((x) => members.find((y) => y.discordId === x.id) !== undefined);
	await sendDinnerMessage(
		`
# Mumsdag i aften

Så blev det onsdag! Jeg håber i får en lækker fællesspisning, og husk at opdater jeres svar hvis noget har ændret sig. Herunder kan i se status for folk der mangler at afgive definitive svar

- **Har ikke afgivet noget svar:** ${
			membersThatHaventReacted.length <= 0
				? "Alle har afgivet mindst et svar! :tada:"
				: stringNaturalLanguageList(
						membersThatHaventReacted.map((user) => `<@${user.id}>`),
					)
		}
- **Har stemt måske og mangler at afgive endeligt svar:** ${
			membersWithMaybeReaction.length <= 0
				? "Alle stemmer er definitive! :partying_face:"
				: stringNaturalLanguageList(
						membersWithMaybeReaction.map((user) => `<@${user.id}>`),
					)
		}
`,
	);
}
