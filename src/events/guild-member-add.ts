import { PartialGuildMember, GuildMember, TextChannel } from 'discord.js';
import { EmbedTemplates } from 'panda-discord';

import { SpindaDiscordBot } from '../bot';
import { LogOptionBit } from '../data/model/guild';
import { BaseLogEvent } from './log';

export class GuildMemberAddEvent extends BaseLogEvent<'guildMemberAdd'> {
    constructor(bot: SpindaDiscordBot) {
        super(bot, 'guildMemberAdd', LogOptionBit.MemberJoined);
    }

    public async run(member: GuildMember | PartialGuildMember) {
        const channel = await this.getDestination(member.guild.id);
        if (channel) {
            const embed = this.bot.createEmbed(EmbedTemplates.Log);
            this.setAuthor(embed, member.user);
            embed.setDescription(member.toString());
            embed.setTitle('Member Joined');

            await (channel as TextChannel).send({ embeds: [embed] });
        }
    }
}
