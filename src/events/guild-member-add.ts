import { GuildMember, PartialGuildMember, TextChannel } from 'discord.js';
import { CommandSource, EmbedTemplates } from 'panda-discord';

import { SpindaDiscordBot } from '../bot';
import { MockCommandSourceForMemberMessages } from '../commands/lib/moderation/member-messages';
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

        const guild = this.bot.dataService.getCachedGuild(member.guild.id);
        if (guild.memberJoinedCode) {
            const publicMessageChannel = member.guild.channels.cache.get(guild.memberMessagesChannelId);
            if (publicMessageChannel) {
                if (member.partial) {
                    member = await member.fetch();
                }

                const mockSrc = new CommandSource(
                    new MockCommandSourceForMemberMessages({
                        member: member as GuildMember,
                        channel: publicMessageChannel as TextChannel,
                        guild: member.guild,
                    }),
                );
                try {
                    await this.bot.customCommandService.run(guild.memberJoinedCode, {
                        params: {
                            bot: this.bot,
                            src: mockSrc,
                            guildId: member.guild.id,
                            extraArgs: {},
                        },
                    });
                } catch (error) {
                    await this.bot.sendError(mockSrc, error);
                }
            }
        }
    }
}
