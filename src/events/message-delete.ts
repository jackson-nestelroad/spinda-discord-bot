import { Message, TextChannel, Channel } from 'discord.js';
import { BaseLogEvent } from './base';
import { DiscordBot } from '../bot';
import { LogOptionBit } from '../data/model/guild';
import { EmbedTemplates } from '../util/embed';

const event = 'messageDelete';

export class MessageDeleteEvent extends BaseLogEvent<typeof event> {
    private readonly noneText = 'None';
    
    constructor(bot: DiscordBot) {
        super(bot, event, LogOptionBit.MessageDeleted);
    }
    
    public async run(msg: Message) {
        const channel = await this.getDestination(msg.guild?.id ?? null);
        if (channel && !msg.author.bot) {
            const embed = this.bot.createEmbed(EmbedTemplates.Log);
            embed.setTimestamp(msg.createdTimestamp);
            
            this.setAuthor(embed, msg.author);
            embed.setTitle('Deleted Message');
            embed.addField('Content', msg.content || this.noneText);
            embed.addField('Channel', msg.channel.toString(), true);
            embed.addField('Profile', msg.author.toString(), true);
            embed.addField('Message ID', msg.id, true);
            embed.addField('Attachments', msg.attachments.map(attachment => attachment.proxyURL || attachment.url).join('\n') || this.noneText);
            
            if (msg.attachments.size !== 0) {
                const attachment = msg.attachments.first();
                embed.setImage(attachment.proxyURL || attachment.url);
            }

            await (channel as TextChannel).send({ embeds: [embed] });
        }
    }
}