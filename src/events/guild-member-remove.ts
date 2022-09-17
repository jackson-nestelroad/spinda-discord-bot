import { GuildMember, PartialGuildMember, TextChannel } from 'discord.js';
import { CommandSource, EmbedTemplates } from 'panda-discord';

import { SpindaDiscordBot } from '../bot';
import { MockCommandSourceForMemberMessages } from '../commands/lib/moderation/member-messages';
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

        const guild = this.bot.dataService.getCachedGuild(member.guild.id);
        if (guild.memberLeftCode) {
            const publicMessageChannel = member.guild.channels.cache.get(guild.memberMessagesChannelId);
            if (publicMessageChannel) {
                const mockSrc = new CommandSource(
                    new MockCommandSourceForMemberMessages({
                        // This conversion is potentially dangerous... as long as CustomCommandEngine
                        // does not do anything abnormal with the member object
                        member: member as GuildMember,
                        channel: publicMessageChannel as TextChannel,
                        guild: member.guild,
                    }),
                );

                try {
                    await this.bot.customCommandService.run(guild.memberLeftCode, {
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
