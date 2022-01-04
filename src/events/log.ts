import { AnyChannel, ClientEvents, MessageEmbed, Snowflake, User } from 'discord.js';
import { BaseEvent } from 'panda-discord';

import { SpindaDiscordBot } from '../bot';
import { LogOptionBit } from '../data/model/guild';

export abstract class BaseLogEvent<K extends keyof ClientEvents> extends BaseEvent<K, SpindaDiscordBot> {
    constructor(bot: SpindaDiscordBot, eventName: K, private logEvent: LogOptionBit) {
        super(bot, eventName);
    }

    protected getUserString(user: User) {
        return `${user.tag} (${user.id})`;
    }

    protected setAuthor(embed: MessageEmbed, user: User) {
        embed.setAuthor(this.getUserString(user), user.avatarURL());
    }

    public async getDestination(guildId: Snowflake): Promise<AnyChannel | null> {
        if (!guildId) {
            return null;
        }

        const guild = await this.bot.dataService.getGuild(guildId);

        // Check that there is a log channel, logging is enabled, and this event is enabled
        if (guild.logChannelId && guild.logOptions & LogOptionBit.Enabled && guild.logOptions & this.logEvent) {
            return this.bot.client.channels.cache.get(guild.logChannelId);
        }
        return null;
    }
}
