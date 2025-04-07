import _ from "lodash";
import { DateTime } from "luxon";
import { RUNNING_IN_PRODUCTION, DISCORD_TEST_CHANNEL_NAME } from "./globals.js";
import { dbclient } from "../db.js";

export async function getBirthdayPeople(targetBirthdayMMDD) {
	const members = await dbclient.getAllBeboer();

	const sortedBirthdays = _.chain(members)
		.map((x) => {
			const birthdayDate = DateTime.fromISO(x.birthday);
			const birthdayYear =
				birthdayDate.set({ year: DateTime.now().year }) < DateTime.now()
					? DateTime.now().year + 1
					: DateTime.now().year;
			return {
				...x,
				sortableBirthday: birthdayDate.toFormat("MM-dd"),
				birthdayYear: birthdayYear,
				nextAge: birthdayYear - birthdayDate.year,
			};
		})
		.sortBy(["sortableBirthday"])
		.value();

	const birthdayPeople = sortedBirthdays.filter(
		(x) => targetBirthdayMMDD === x.sortableBirthday,
	);

	return {
		birthdayPeople,
		sortedBirthdays,
		members,
		birthdayYear: birthdayPeople[0]?.birthdayYear,
	};
}

export function buildBirthdayChannelName(
	birthdayPeople,
	birthdayYear,
	channelNameSuffix,
) {
	if (!RUNNING_IN_PRODUCTION) {
		return DISCORD_TEST_CHANNEL_NAME;
	}
	return `${birthdayPeople.map((x) => x.name.toLowerCase()).join("-")}-fødselsdag-${birthdayYear}${channelNameSuffix ? `-${channelNameSuffix}` : ""}`;
}
