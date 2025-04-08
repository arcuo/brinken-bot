import _ from "lodash";
import { DateTime } from "luxon";
import {
	DISCORD_TEST_CHANNEL_NAME,
	RUNNING_IN_PRODUCTION,
} from "../globals.js";
import { dbclient, type User } from "../db.js";

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
	birthdayPeople: User[],
	birthdayYear: string,
	channelNameSuffix?: string | undefined,
) {
	if (!RUNNING_IN_PRODUCTION) {
		return DISCORD_TEST_CHANNEL_NAME;
	}
	return `${birthdayPeople.map((x) => x.name.toLowerCase()).join("-")}-fødselsdag-${birthdayYear}${channelNameSuffix ? `-${channelNameSuffix}` : ""}`;
}
