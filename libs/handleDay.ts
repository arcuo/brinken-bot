import { DateTime } from "luxon";
import * as birthdayCRON from "./birthday/cron.js";
import * as dinnerCRON from "./dinner/cron.js";
import * as housemeetingCRON from "./housemeeting/cron.js";

export async function handleDay() {
	const inAWeek = DateTime.now().plus({ weeks: 1 }).toFormat("MM-dd");
	console.log(inAWeek);
	await birthdayCRON.handleWeekBeforeBirthday(inAWeek);
	const inADay = DateTime.now().plus({ days: 1 }).toFormat("MM-dd");
	console.log(inADay);
	await birthdayCRON.handleDayBeforeBirthday(inADay);
	const inTwoDays = DateTime.now().plus({ days: 2 });
	console.log(inTwoDays);
	await housemeetingCRON.handleTwoDaysBeforeHouseMeeting(inTwoDays);
	const inThreeDays = DateTime.now().plus({ days: 3 });
	console.log(inThreeDays);
	await dinnerCRON.handleThreeDaysBeforeDinner(inThreeDays);
	const today = DateTime.now();
	console.log(today);
	await dinnerCRON.handleDayOfDinner(today);
}

handleDay();

process.exit(0);
