import {
	DISCORD_TEST_CHANNEL_ID,
	sendMessageToChannel,
} from "../libs/globals.js";

await sendMessageToChannel({
	channelId: DISCORD_TEST_CHANNEL_ID,
	content: "Running dinner cron",
});
