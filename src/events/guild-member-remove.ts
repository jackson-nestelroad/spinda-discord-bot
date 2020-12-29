import { PartialGuildMember, GuildMember, TextChannel } from 'discord.js';
import { BaseLogEvent } from './base';
import { DiscordBot } from '../bot';
import { LogOptionBit } from '../data/model/guild';

const event = 'guildMemberRemove';

export class GuildMemberRemoveEvent extends BaseLogEvent<typeof event> {
    constructor(bot: DiscordBot) {
        super(bot, event, LogOptionBit.MemberLeft);
    }
    
    public async run(member: GuildMember | PartialGuildMember) {
        const channel = await this.getDestination(member.guild.id);
        if (channel) {
            const embed = this.bot.createEmbed({ footer: true, timestamp: true });
            
            this.setAuthor(embed, member.user);
            embed.setTitle('Member Removed');
            embed.setDescription(this.getUserString(member.user));

            await (channel as TextChannel).send(embed);
        }
    }
}