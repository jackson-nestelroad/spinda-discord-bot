import { GuildMember, PartialGuildMember, TextChannel } from 'discord.js';
import { EmbedTemplates } from 'panda-discord';

import { SpindaDiscordBot } from '../bot';
import { LogOptionBit } from '../data/model/guild';
import { BaseLogEvent } from './log';

export class GuildMemberUpdateEvent extends BaseLogEvent<'guildMemberUpdate'> {
    constructor(bot: SpindaDiscordBot) {
        super(bot, 'guildMemberUpdate', LogOptionBit.MemberUpdated);
    }

    public async run(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
        const channel = await this.getDestination(newMember.guild.id);
        if (channel && !newMember.user.bot) {
            const embed = this.bot.createEmbed(EmbedTemplates.Log);
            this.setAuthor(embed, newMember.user);

            if (oldMember.nickname !== newMember.nickname) {
                embed.setTitle('Nickname Updated');
                embed.setDescription(newMember.toString());
                embed.addFields(
                    { name: 'Old', value: oldMember.nickname ?? 'None', inline: true },
                    { name: 'New', value: newMember.nickname ?? 'None', inline: true },
                );
            } else if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
                const added = newMember.roles.cache.size > oldMember.roles.cache.size;
                const difference = newMember.roles.cache.difference(oldMember.roles.cache);

                embed.setTitle(`Role ${added ? 'Added' : 'Removed'}`);
                embed.addFields(
                    { name: 'Roles', value: difference.map(role => role.toString()).join('\n') },
                    { name: 'Profile', value: newMember.toString() },
                );
            }
            // Unknown event, log nothing
            else {
                return;
            }

            await (channel as TextChannel).send({ embeds: [embed] });
        }
    }
}
