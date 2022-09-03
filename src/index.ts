import { GatewayIntentBits, Partials } from 'discord.js';
import { config } from 'dotenv';
import { EnabledCommandType } from 'panda-discord';

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
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildBans,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
            ],
            // For commands that run in DMs
            partials: [Partials.Channel],
        },
        commands: CommandTypes,
        events: EventTypes,
        interactionEvent: InteractionCreateEvent,
        owner: Environment.getGlobalOwner(),
        commandType: EnabledCommandType.Chat | EnabledCommandType.Slash,
    });
    await bot.run(Environment.getDiscordToken());
})().catch(error => {
    console.error(error);
    process.exit(1);
});
