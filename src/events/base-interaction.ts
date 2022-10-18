import { Interaction } from 'discord.js';
import { BaseEvent } from 'panda-discord';

import { SpindaDiscordBot } from '../bot';

export abstract class BaseInteractionEvent extends BaseEvent<'interactionCreate', SpindaDiscordBot> {
    constructor(bot: SpindaDiscordBot) {
        super(bot, 'interactionCreate');
    }

    public async shouldProcess(interaction: Interaction): Promise<boolean> {
        // User is a bot
        if (interaction.user.bot) {
            return false;
        }

        // User is on timeout
        if (this.bot.timeoutService.onTimeout(interaction.user)) {
            return false;
        }

        if (interaction.guildId) {
            // User is blocklisted in this guild
            const blocklist = await this.bot.dataService.getBlocklist(interaction.guildId);
            if (blocklist.has(interaction.user.id)) {
                return false;
            }

            if (!this.bot.dataService.hasGuildInCache(interaction.guildId)) {
                await this.bot.dataService.getGuild(interaction.guildId);
            }
        }

        return true;
    }
}
