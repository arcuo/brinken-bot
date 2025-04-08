import { DateTime } from "luxon";
import {
	DISCORD_TEST_CHANNEL_NAME,
	RUNNING_IN_PRODUCTION,
} from "../globals.js";
import { dbclient, type User } from "../db.js";

export function getBirthdayPeople(targetBirthdayMMDD: string) {
	const allBirthdays = dbclient.getAllBeboer().map((m) => {
		const birthdayDate = DateTime.fromISO(m.birthday);

		// Check year
		const birthdayYear =
			birthdayDate.set({ year: DateTime.now().year }) < DateTime.now()
				? DateTime.now().year + 1
				: DateTime.now().year;
		return {
			...m,
			formattedBirthday: birthdayDate.toFormat("MM.dd"),
			birthdayYear: birthdayYear,
			nextAge: birthdayYear - birthdayDate.year,
		};
	});

	const birthdayPeople = allBirthdays.filter(
		(m) =>
			targetBirthdayMMDD === DateTime.fromISO(m.birthday).toFormat("MM.dd"),
	);

	const birthdayResponsible =
		allBirthdays[
			(allBirthdays.findIndex((x) => x.id === birthdayPeople[0].id) - 1) %
				allBirthdays.length
		];

	return {
		birthdayPeople,
		birthdayResponsible,
		birthdayYear: birthdayPeople[0]?.birthdayYear,
		allBirthdays,
	};
}

export function buildBirthdayChannelName(
	birthdayPeople: User[],
	birthdayYear: number,
	channelNameSuffix?: string | undefined,
) {
	if (!RUNNING_IN_PRODUCTION) {
		return DISCORD_TEST_CHANNEL_NAME;
	}
	return `${birthdayPeople.map((x) => x.name.toLowerCase()).join("-")}-fødselsdag-${birthdayYear}${channelNameSuffix ? `-${channelNameSuffix}` : ""}`;
}
