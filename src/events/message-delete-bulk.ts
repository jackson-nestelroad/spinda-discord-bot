import { Message, TextChannel, Channel, Collection, Snowflake, MessageAttachment } from 'discord.js';
import { BaseLogEvent } from './base';
import { DiscordBot } from '../bot';
import { LogOptionBit } from '../data/model/guild';

const event = 'messageDeleteBulk';

export class MessageDeleteBulkEvent extends BaseLogEvent<typeof event> {
    private readonly noneText = 'None';
    
    constructor(bot: DiscordBot) {
        super(bot, event, LogOptionBit.BulkMessageDeletion);
    }
    
    public async run(messages: Collection<Snowflake, Message>) {
        if (messages.size > 0) {
            const firstMessage = messages.first();
            const channel = await this.getDestination(firstMessage.guild?.id ?? null);
            if (channel) {
                const embed = this.bot.createEmbed({ footer: true, timestamp: true });
                
                embed.setTitle('Bulk Message Deletion');
                embed.setDescription(`${messages.size} message${messages.size === 1 ? '' : 's'} deleted in ${firstMessage.channel.toString()}`);

                let file = '';
                for (const [id, msg] of messages) {
                    file += `${this.getUserString(msg.author)}\n[${new Date(msg.createdTimestamp).toLocaleString()}]\n${msg.content || 'No content'}\n\n`;
                }

                embed.attachFiles(new MessageAttachment(Buffer.from(file, 'utf16le'), `${embed.timestamp}.txt`) as any);
                await (channel as TextChannel).send(embed);
            }
        }
    }
}