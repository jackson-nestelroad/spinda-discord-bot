import { PartialGuildMember, GuildMember, TextChannel } from 'discord.js';
import { BaseLogEvent } from './base';
import { DiscordBot } from '../bot';
import { LogOptionBit } from '../data/model/guild';
import { EmbedTemplates } from '../util/embed';

const event = 'guildMemberAdd';

export class GuildMemberAddEvent extends BaseLogEvent<typeof event> {
    constructor(bot: DiscordBot) {
        super(bot, event, LogOptionBit.MemberJoined);
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