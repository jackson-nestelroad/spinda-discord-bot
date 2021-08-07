import { Intents } from 'discord.js';
import { config } from 'dotenv';

import { SpindaDiscordBot } from './bot';
import { CommandTypes } from './commands';
import { Environment } from './data/environment';
import { EventTypes } from './events';
import { InteractionCreateEvent } from './events/interaction-create';

// Use local .env file
if (Environment.getEnvironment() !== 'production') {
    config();
}

(async () => {
    const bot = new SpindaDiscordBot({
        client: {
            intents: [
                Intents.FLAGS.GUILDS,
                Intents.FLAGS.GUILD_BANS,
                Intents.FLAGS.GUILD_MEMBERS,
                Intents.FLAGS.GUILD_MESSAGES,
            ],
        },
        commands: CommandTypes,
        events: EventTypes,
        interactionEvent: InteractionCreateEvent,
        owner: Environment.getGlobalOwner(),
    });
    await bot.run(Environment.getDiscordToken());
})().catch(error => {
    console.error(error);
    process.exit(1);
});
