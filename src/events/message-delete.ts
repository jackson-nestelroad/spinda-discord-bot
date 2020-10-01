import { Message } from 'discord.js';
import { BaseEvent } from './base';
import { DiscordBot } from '../bot';

const event = 'messageDelete';

export class MessageDeleteEvent extends BaseEvent<typeof event> {
    private readonly noneText = 'None';
    
    constructor(bot: DiscordBot) {
        super(bot, event);
    }
    
    public async run(msg: Message) {
        const guild = await this.bot.dataService.getGuild(msg.guild.id);
        if (!msg.author.bot && guild.logDeletedMessages) {
            const embed = this.bot.createEmbed();
            embed.setTimestamp(msg.createdTimestamp);
            
            embed.setAuthor(`${msg.author.username}#${msg.author.discriminator} (${msg.author.id})`, msg.author.avatarURL());
            embed.setTitle('Deleted Message');
            embed.addField('Content', msg.content || this.noneText);
            embed.addField('Channel', msg.channel.toString(), true);
            embed.addField('Message ID', msg.id, true);
            embed.addField('Attachments', msg.attachments.map(attachment => attachment.proxyURL || attachment.url).join('\n') || this.noneText);
            
            if (msg.attachments.size !== 0) {
                const attachment = msg.attachments.first();
                embed.setImage(attachment.proxyURL || attachment.url);
            }

            await msg.channel.send(embed);
        }
    }
}