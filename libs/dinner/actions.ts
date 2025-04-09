import {
	deleteMessageActionId,
	cacheInteraction,
	isInteractionValid,
	getInteraction,
	type ActionListeners,
} from "../globals.js";
import { DateTime, Interval } from "luxon";
import {
	ActionRowBuilder,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
} from "discord.js";
import { dbclient } from "../db.js";

/**
 * @callback ActionlistenerCb
 * @param {object} obj
 * @param {import("discord.js").Interaction} obj.interaction
 * @param {string} obj.actionValue
 */

/**
 * @type {[string, ActionlistenerCb][]}
 */
export const dinnerActionListeners: ActionListeners = [
	{
		id: "see-dinner-schedule",
		action: async ({ interaction }) => {
			if (!interaction.isButton()) {
				return;
			}
			await handlerDinnerScheduleActionResponse({
				interaction,
				startDate: DateTime.now(),
				endDate: DateTime.now().plus({ weeks: 4 }),
				updateOriginal: false,
			});
		},
	},
	{
		id: "show-more-dinner-schedule",
		action: async ({ interaction, actionValue }) => {
			if (!interaction.isButton()) {
				return;
			}
			const [endDateISO, isContinuedMessageString, startDateISO] =
				actionValue.split("#");
			let startDate = DateTime.fromISO(startDateISO);
			const endDate = DateTime.fromISO(endDateISO).plus({ weeks: 4 });
			let isContinuedMessage = isContinuedMessageString === "true";
			let updateOriginal = true;
			let needToSplitMessage = false;

			if (Interval.fromDateTimes(startDate, endDate).length("weeks") > 17) {
				startDate = DateTime.fromISO(endDateISO);
				isContinuedMessage = true;
				updateOriginal = false;
				needToSplitMessage = true;
			}
			await handlerDinnerScheduleActionResponse({
				interaction,
				startDate,
				endDate,
				updateOriginal,
				isContinuedMessage,
			});

			if (needToSplitMessage) {
				await handlerDinnerScheduleActionResponse({
					interaction,
					startDate: DateTime.fromISO(startDateISO),
					endDate: DateTime.fromISO(endDateISO),
					updateOriginal: true,
					isContinuedMessage: isContinuedMessageString === "true",
					disableShowMore: true,
					replyAlreadyAcknowledged: true,
				});
			}
		},
	},
	// 	[
	// 		// TODO: Fix this for sqlite
	// 		"edit-dinner-schedule",
	// 		async ({ interaction }) => {
	// 			await interaction.reply({
	// 				content: `Det kan godt være det følgende virker lidt skræmmende for en ikke teknisk person, men jeg ved du godt kan klare det, og bare rolig hvis noget går galt så fikser vi det bare igen, ingen fare overhovedet :heart:.

	// For at beholde så meget fleksibilitet som muligt har vi valgt at den bedste måde, trods lidt kompleksitet, er at rette direkte i vores "database." Vi har dog heldigvis bare brugt Google Sheets som vores database for at forhåbentligt gøre det så nemt som muligt at rette i. Tryk på knappen nedenfor for at gå til regnearket, hvor du først vil se den mere menneskelæselige version hvor du kan få overblik over hvordan du vil rette. Når du så rent faktisk skal rette går du over til "${MUMSDAG_SHEET_NAME}" arket, dette er også tydeligt markeret i regnearket, og her kan du så lave de rent faktiske database rettelser. Computere er dumme så det er vigtigt her at du følger formatet med at bruge tal til at referere til os beboere og at dateerne er i År-Måned-Date format, men som vi skrev ovenfor, bare stol på dig selv, det skal nok gå, og hvis noget går galt så fikser de mere tekniske personer i kollektivet det bare. Der er intet der er i fare for at blive fuldstændig ødelagt, vi kan altid finde tilbage til den tilstand den var i før.`,
	// 				components: [
	// 					new ActionRowBuilder().addComponents(
	// 						new ButtonBuilder()
	// 							.setLabel("Gå til database regnearket")
	// 							.setStyle(ButtonStyle.Link)
	// 							.setURL(
	// 								"https://docs.google.com/spreadsheets/d/12BjvaehXZyt2CI_rqfexB6pXbZcACS4x3iKM7xMaMOI/edit?usp=sharing&gid=451251755",
	// 							),
	// 					),
	// 				],
	// 			});
	// 		},
	// 	],
];

async function handlerDinnerScheduleActionResponse({
	interaction,
	startDate,
	endDate,
	updateOriginal,
	isContinuedMessage = false,
	disableShowMore = false,
	replyAlreadyAcknowledged = false,
}: {
	interaction: ButtonInteraction;
	startDate: DateTime;
	endDate: DateTime;
	updateOriginal: boolean;
	isContinuedMessage?: boolean;
	disableShowMore?: boolean;
	replyAlreadyAcknowledged?: boolean;
}) {
	const allMumsdag = (await dbclient.getAllMumsdagWithChefs()).map((m) => {
		return {
			...m,
			localeDate: DateTime.fromISO(m.date)
				.setLocale("da-dk")
				.toLocaleString(DateTime.DATE_FULL),
		};
	});

	const targetDbRows = allMumsdag.filter(
		(x) =>
			x.date >= startDate.toFormat("yyyy-MM-dd") &&
			x.date <= endDate.toFormat("yyyy-MM-dd"),
	);

	const hasMore =
		allMumsdag.find((x) => x.date > endDate.toFormat("yyyy-MM-dd")) !==
		undefined;

	const content = `\
# ${
		isContinuedMessage
			? "Fortsat Mumsdag Program\n\nDer er en makslængde på beskeder i Discord så jeg blev nødt til at splitte skemaet op i flere beskeder"
			: "Mumsdag Program"
	}

${targetDbRows
	.map(
		(x) => `\
- **${x.localeDate}:**
  - :cook: **Head Chef:** ${x.mainChefName}
  - :cook: **Souschef:** ${x.sousChefName}`,
	)
	.join("\n")}`;

	const actionRow = new ActionRowBuilder<ButtonBuilder>();
	actionRow.addComponents(
		new ButtonBuilder()
			.setCustomId(
				`show-more-dinner-schedule*${endDate.toISO()}#${isContinuedMessage.toString()}#${startDate.toISO()}`,
			)
			.setLabel("Vis flere")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(disableShowMore || !hasMore),
	);

	actionRow.addComponents(
		new ButtonBuilder()
			.setCustomId(deleteMessageActionId)
			.setLabel("Skjul skema")
			.setStyle(ButtonStyle.Danger),
	);

	if (updateOriginal) {
		const messageId = interaction.message.id;
		const oldInteraction = getInteraction(messageId);
		if (
			!oldInteraction?.isButton() ||
			!isInteractionValid(messageId) ||
			oldInteraction === undefined
		) {
			if (replyAlreadyAcknowledged) {
				return;
			}
			await interaction.reply({
				content,
				components: [actionRow],
			});
			await interaction.followUp({
				content:
					"Da Discord ikke tillader at opdatere beskeder der er over 15 minutter gamle, så har jeg istedet sendt dig en ny besked",
			});
			const reply = await interaction.fetchReply();
			cacheInteraction({
				timestamp: reply.createdTimestamp,
				interaction,
				messageId: reply.id,
			});
			return;
		}

		if (!replyAlreadyAcknowledged) {
			await interaction.deferUpdate();
		}
		await oldInteraction.editReply({
			content,
			components: [actionRow],
		});
	} else {
		await interaction.reply({
			content,
			components: [actionRow],
		});
		const reply = await interaction.fetchReply();
		cacheInteraction({
			timestamp: reply.createdTimestamp,
			interaction,
			messageId: reply.id,
		});
	}
}
