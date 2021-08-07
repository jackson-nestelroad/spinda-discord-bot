import { Message, TextChannel, Collection, Snowflake, MessageAttachment } from 'discord.js';
import { EmbedTemplates } from 'panda-discord';

import { SpindaDiscordBot } from '../bot';
import { LogOptionBit } from '../data/model/guild';
import { BaseLogEvent } from './log';

export class MessageDeleteBulkEvent extends BaseLogEvent<'messageDeleteBulk'> {
    private readonly noneText = 'None';

    constructor(bot: SpindaDiscordBot) {
        super(bot, 'messageDeleteBulk', LogOptionBit.BulkMessageDeletion);
    }

    public async run(messages: Collection<Snowflake, Message>) {
        if (messages.size > 0) {
            const firstMessage = messages.first();
            const channel = await this.getDestination(firstMessage.guild?.id ?? null);
            if (channel) {
                const embed = this.bot.createEmbed(EmbedTemplates.Log);

                embed.setTitle('Bulk Message Deletion');
                embed.setDescription(
                    `${messages.size} message${
                        messages.size === 1 ? '' : 's'
                    } deleted in ${firstMessage.channel.toString()}.`,
                );

                let file = '';
                for (const [id, msg] of messages) {
                    file += `${this.getUserString(msg.author)}\n[${new Date(msg.createdTimestamp).toLocaleString()}]\n${
                        msg.content || 'No content'
                    }\n\n`;
                }

                const attachment = new MessageAttachment(Buffer.from(file, 'utf16le'), `${embed.timestamp}.txt`);
                await (channel as TextChannel).send({ embeds: [embed], files: [attachment] });
            }
        }
    }
}
