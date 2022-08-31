import { Message, TextChannel } from 'discord.js';
import { EmbedTemplates } from 'panda-discord';

import { SpindaDiscordBot } from '../bot';
import { LogOptionBit } from '../data/model/guild';
import { BaseLogEvent } from './log';

export class MessageDeleteEvent extends BaseLogEvent<'messageDelete'> {
    private readonly noneText = 'None';

    constructor(bot: SpindaDiscordBot) {
        super(bot, 'messageDelete', LogOptionBit.MessageDeleted);
    }

    public async run(msg: Message) {
        const channel = await this.getDestination(msg.guild?.id ?? null);
        if (channel && !msg.author.bot) {
            const embed = this.bot.createEmbed(EmbedTemplates.Log);
            embed.setTimestamp(msg.createdTimestamp);

            this.setAuthor(embed, msg.author);
            embed.setTitle('Deleted Message');
            embed.addFields(
                { name: 'Content', value: msg.content || this.noneText },
                { name: 'Channel', value: msg.channel.toString(), inline: true },
                { name: 'Profile', value: msg.author.toString(), inline: true },
                { name: 'Message ID', value: msg.id, inline: true },
                {
                    name: 'Attachments',
                    value:
                        msg.attachments.map(attachment => attachment.proxyURL || attachment.url).join('\n') ||
                        this.noneText,
                },
            );

            if (msg.attachments.size !== 0) {
                const attachment = msg.attachments.first();
                embed.setImage(attachment.proxyURL || attachment.url);
            }

            await (channel as TextChannel).send({ embeds: [embed] });
        }
    }
}
