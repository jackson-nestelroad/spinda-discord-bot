import { PartialGuildMember, GuildMember, TextChannel } from 'discord.js';
import { EmbedTemplates } from 'panda-discord';

import { SpindaDiscordBot } from '../bot';
import { LogOptionBit } from '../data/model/guild';
import { BaseLogEvent } from './log';

export class GuildMemberRemoveEvent extends BaseLogEvent<'guildMemberRemove'> {
    constructor(bot: SpindaDiscordBot) {
        super(bot, 'guildMemberRemove', LogOptionBit.MemberLeft);
    }

    public async run(member: GuildMember | PartialGuildMember) {
        const channel = await this.getDestination(member.guild.id);
        if (channel) {
            const embed = this.bot.createEmbed(EmbedTemplates.Log);
            this.setAuthor(embed, member.user);
            embed.setDescription(member.toString());
            embed.setTitle('Member Removed');

            await (channel as TextChannel).send({ embeds: [embed] });
        }
    }
}
