import "../index.js";
import { discordClient } from "../libs/globals.js";

// Call a function that you want to test here
const guild = await discordClient.guilds.fetch(DISCORD_GUILD_ID);

await guild.members
	.fetch()
	.then(console.log)
	.then(() => discordClient.destroy())
	.then(() => process.exit(0));
