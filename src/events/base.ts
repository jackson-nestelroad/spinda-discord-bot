import { ClientEvents, Channel, MessageEmbed, User } from 'discord.js';
import { DiscordBot } from '../bot';
import { LogOptionBit } from '../data/model/guild';

export abstract class BaseEvent<K extends keyof ClientEvents> {
    constructor(
        protected bot: DiscordBot,
        eventName: K,
    ) {
        this.bot.client.on(eventName, this.run.bind(this));
    }

    public abstract async run(...args: ClientEvents[K]): Promise<void>;
}

export abstract class BaseLogEvent<K extends keyof ClientEvents> extends BaseEvent<K> {
    constructor(
        bot: DiscordBot,
        eventName: K,
        private logEvent: LogOptionBit,
    ) {
        super(bot, eventName);
    }

    protected getUserString(user: User) {
        return `${user.tag} (${user.id})`;
    }

    protected setAuthor(embed: MessageEmbed, user: User) {
        embed.setAuthor(this.getUserString(user), user.avatarURL());
    }
    
    public async getDestination(guildId: string): Promise<Channel | null> {
        const guild = await this.bot.dataService.getGuild(guildId);
        
        // Check that there is a log channel, logging is enabled, and this event is enabled
        if (guild.logChannelId && (guild.logOptions & LogOptionBit.Enabled) && (guild.logOptions & this.logEvent)) {
            return this.bot.client.channels.cache.get(guild.logChannelId);
        }
        return null;
    }
}