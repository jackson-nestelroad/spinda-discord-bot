import { GatewayIntentBits, Partials } from 'discord.js';

import { CommandTypes } from './commands';
import { EnabledCommandType } from 'panda-discord';
import { Environment } from './data/environment';
import { EventTypes } from './events';
import { InteractionCreateEvent } from './events/interaction-create';
import { SpindaDiscordBot } from './bot';
import { config } from 'dotenv';

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
        commandType: EnabledCommandType.Message | EnabledCommandType.Slash,
    });
    await bot.run(Environment.getDiscordToken());
})().catch(error => {
    console.error(error);
    process.exit(1);
});
