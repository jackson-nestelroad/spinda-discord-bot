import { TextChannel, Guild, User } from 'discord.js';
import { BaseLogEvent } from './base';
import { DiscordBot } from '../bot';
import { LogOptionBit } from '../data/model/guild';

const event = 'guildBanAdd';

export class GuildBanAddEvent extends BaseLogEvent<typeof event> {
    constructor(bot: DiscordBot) {
        super(bot, event, LogOptionBit.MemberUpdated);
    }
    
    public async run(guild: Guild, user: User) {
        const channel = await this.getDestination(guild.id);
        if (channel) {
            const embed = this.bot.createEmbed({ footer: true, timestamp: true });
            this.setAuthor(embed, user);
            embed.setTitle('Member Banned');

            const banInfo = await guild.fetchBan(user);
            embed.addField('Reason', banInfo.reason);

            await (channel as TextChannel).send(embed);
        }
    }
}