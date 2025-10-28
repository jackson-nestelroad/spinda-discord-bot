import {
    AttachmentBuilder,
    Collection,
    GuildTextBasedChannel,
    Message,
    PartialMessage,
    ReadonlyCollection,
    Snowflake,
    TextChannel,
} from 'discord.js';
import { EmbedTemplates } from 'panda-discord';

import { SpindaDiscordBot } from '../bot';
import { LogOptionBit } from '../data/model/guild';
import { BaseLogEvent } from './log';

export class MessageDeleteBulkEvent extends BaseLogEvent<'messageDeleteBulk'> {
    constructor(bot: SpindaDiscordBot) {
        super(bot, 'messageDeleteBulk', LogOptionBit.BulkMessageDeletion);
    }

    public async run(
        messages: ReadonlyCollection<Snowflake, Message | PartialMessage>,
        channel: GuildTextBasedChannel,
    ) {
        if (messages.size > 0) {
            const logChannel = await this.getDestination(channel.guild.id);
            if (logChannel && logChannel.isSendable()) {
                const embed = this.bot.createEmbed(EmbedTemplates.Log);

                embed.setTitle('Bulk Message Deletion');
                embed.setDescription(
                    `${messages.size} message${messages.size === 1 ? '' : 's'} deleted in ${channel.toString()}.`,
                );

                let file = '';
                for (const [id, msg] of messages) {
                    file += `${this.getUserString(msg.author)}\n[${new Date(msg.createdTimestamp).toLocaleString()}]\n${
                        msg.content || 'No content'
                    }\n\n`;
                }

                const attachment = new AttachmentBuilder(Buffer.from(file, 'utf16le'), {
                    name: `${embed.data.timestamp}.txt`,
                });
                await logChannel.send({ embeds: [embed], files: [attachment] });
            }
        }
    }
}
