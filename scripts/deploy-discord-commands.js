import * as Discord from "discord.js";
import { slashCommands } from "../libs/slash-commands.js";
import { DISCORD_CLIENT_ID, DISCORD_GUILD_ID } from "../libs/globals.js";

const rest = new Discord.REST().setToken(process.env.DISCORD_BOT_TOKEN);
try {
  await rest.put(
    Discord.Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
    {
      body: slashCommands.map((x) => x.data.toJSON()),
    }
  );

  console.log("Success");
} catch (error) {
  console.error(error);
}
