import { PartialGuildMember, GuildMember, TextChannel } from 'discord.js';
import { BaseLogEvent } from './base';
import { DiscordBot } from '../bot';
import { LogOptionBit } from '../data/model/guild';

const event = 'guildMemberUpdate';

export class GuildMemberUpdateEvent extends BaseLogEvent<typeof event> {
    constructor(bot: DiscordBot) {
        super(bot, event, LogOptionBit.MemberUpdated);
    }
    
    public async run(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember | PartialGuildMember) {
        const channel = await this.getDestination(newMember.guild.id);
        if (channel && !newMember.user.bot) {
            const embed = this.bot.createEmbed({ footer: true, timestamp: true });
            this.setAuthor(embed, newMember.user);
            
            if (oldMember.nickname !== newMember.nickname) {
                embed.setTitle('Nickname Updated');
                embed.addField('Old', oldMember.nickname ?? 'None', true);
                embed.addField('New', newMember.nickname ?? 'None', true);
            }
            else if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
                const added = newMember.roles.cache.size > oldMember.roles.cache.size;
                const difference = newMember.roles.cache.difference(oldMember.roles.cache);
            
                embed.setTitle(`Role ${added ? 'Added' : 'Removed'}`);
                embed.setDescription(difference.map(role => role.toString()).join('\n'));
            }

            await (channel as TextChannel).send(embed);
        }
    }
}