import _ from "lodash";
import { DateTime } from "luxon";
import { deleteMessageActionId, cacheInteraction } from "./globals.js";
import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import { ButtonStyle } from "discord.js";

/**
 * @callback ActionlistenerCb
 * @param {object} obj
 * @param {import("discord.js").Interaction} obj.interaction
 * @param {string} obj.actionValue
 */

/**
 * @type {[string, ActionlistenerCb][]}
 */
export const birthdayActionListeners = [
	[
		"see-birthday-schedule",
		async ({ interaction }) => {
			const { sortedBirthdays: sortedRelativeTo1Jan } =
				await getBirthdayPeople("");
			const [sortedBirthdaysThisYear, sortedBirthdaysNextYear] = _.chain(
				sortedRelativeTo1Jan,
			)
				.partition((x) => x.birthdayYear === DateTime.now().year)
				.value();

			const sortedBirthdays = [
				...sortedBirthdaysThisYear,
				...sortedBirthdaysNextYear,
			];

			await interaction.reply({
				content: `\
# Næste Års Fødselsdage

${sortedBirthdays
	.map(
		(x) => `\
- :flag_dk: d. **${DateTime.fromISO(x.birthday)
			.setLocale("da-DK")
			.toFormat("dd. MMMM")}** bliver ${
			x["discord-id"] ? `<@${x["discord-id"]}>` : `**${x.name}**`
		} ${x.nextAge} år :flag_dk:`,
	)
	.join("\n")}`,
				components: [
					new ActionRowBuilder().addComponents([
						new ButtonBuilder()
							.setCustomId(deleteMessageActionId)
							.setLabel("Skjul besked")
							.setStyle(ButtonStyle.Danger),
					]),
				],
			});
			const reply = await interaction.fetchReply();
			cacheInteraction({
				timestamp: reply.createdTimestamp,
				interaction,
				messageId: reply.id,
			});
		},
	],
];
