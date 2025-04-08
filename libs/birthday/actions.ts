import { DateTime } from "luxon";
import {
	deleteMessageActionId,
	cacheInteraction,
	type ActionListeners,
} from "../globals.js";
import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import { ButtonStyle } from "discord.js";
import { getBirthdayPeople } from "./utils.js";

export const birthdayActionListeners: ActionListeners = [
	{
		id: "see-birthday-schedule",
		action: async ({ interaction }) => {
			if (!interaction.isRepliable()) return;
			const { allBirthdays } = await getBirthdayPeople("");

			const indexOfNextyear = allBirthdays.findIndex(m => m.formattedBirthday.localeCompare(DateTime.now().toFormat("MM-dd")) < 0);
			const birthdaysThisYear = allBirthdays.splice(0, indexOfNextyear);

			const NextBirthdays = [
				...allBirthdays,
				...birthdaysThisYear,
			];

			await interaction.reply({
				content: `\
# Næste Års Fødselsdage

${NextBirthdays
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
					new ActionRowBuilder<ButtonBuilder>().addComponents([
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
	},
];
