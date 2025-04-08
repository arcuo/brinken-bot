import { DateTime } from "luxon";
import * as birthdayCRON from "./birthday/cron.js";
import * as dinnerCRON from "./dinner/cron.js";
import * as housemeetingCRON from "./housemeeting/cron.js";

export async function handleDay() {
	const inAWeek = DateTime.now().plus({ weeks: 1 }).toFormat("MM-dd");
	console.log(`Handling week before birthday: ${inAWeek}`);
	birthdayCRON.handleWeekBeforeBirthday(inAWeek);
	
	const inADay = DateTime.now().plus({ days: 1 }).toFormat("MM-dd");
	console.log(`Handling day before birthday: ${inADay}`);
	birthdayCRON.handleDayBeforeBirthday(inADay);
	
	const inTwoDays = DateTime.now().plus({ days: 2 });
	console.log(`Handling two days before house meeting: ${inTwoDays}`);
	housemeetingCRON.handleTwoDaysBeforeHouseMeeting(inTwoDays);

	const inThreeDays = DateTime.now().plus({ days: 3 });
	console.log(`Handling three days before dinner: ${inThreeDays}`);
	dinnerCRON.handleThreeDaysBeforeDinner(inThreeDays);

	const today = DateTime.now();
	console.log(`Handling today: ${today}`);
	dinnerCRON.handleDayOfDinner(today);
}
