import { PartialGuildMember, GuildMember, TextChannel } from 'discord.js';
import { BaseLogEvent } from './base';
import { DiscordBot } from '../bot';
import { LogOptionBit } from '../data/model/guild';
import { EmbedTemplates } from '../util/embed';

const event = 'guildMemberUpdate';

export class GuildMemberUpdateEvent extends BaseLogEvent<typeof event> {
    constructor(bot: DiscordBot) {
        super(bot, event, LogOptionBit.MemberUpdated);
    }
    
    public async run(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember | PartialGuildMember) {
        const channel = await this.getDestination(newMember.guild.id);
        if (channel && !newMember.user.bot) {
            const embed = this.bot.createEmbed(EmbedTemplates.Log);
            this.setAuthor(embed, newMember.user);
            
            if (oldMember.nickname !== newMember.nickname) {
                embed.setTitle('Nickname Updated');
                embed.setDescription(newMember.toString());
                embed.addField('Old', oldMember.nickname ?? 'None', true);
                embed.addField('New', newMember.nickname ?? 'None', true);
            }
            else if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
                const added = newMember.roles.cache.size > oldMember.roles.cache.size;
                const difference = newMember.roles.cache.difference(oldMember.roles.cache);
            
                embed.setTitle(`Role ${added ? 'Added' : 'Removed'}`);
                embed.addField('Roles', difference.map(role => role.toString()).join('\n'));
                embed.addField('Profile', newMember.toString());
            }
            // Unknown event, log nothing
            else {
                return;
            }

            await (channel as TextChannel).send({ embeds: [embed] });
        }
    }
}