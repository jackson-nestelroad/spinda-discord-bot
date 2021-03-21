import { Message, TextChannel, Channel } from 'discord.js';
import { BaseLogEvent } from './base';
import { DiscordBot } from '../bot';
import { LogOptionBit } from '../data/model/guild';
import { EmbedTemplates } from '../util/embed';

const event = 'messageUpdate';

export class MessageUpdateEvent extends BaseLogEvent<typeof event> {
    private readonly noneText = 'None';
    
    constructor(bot: DiscordBot) {
        super(bot, event, LogOptionBit.MessageEdited);
    }
    
    public async run(oldMsg: Message, newMsg: Message) {
        const channel = await this.getDestination(newMsg.guild?.id ?? null);
        if (channel && !newMsg.author.bot) {
            const embed = this.bot.createEmbed(EmbedTemplates.Log);
            embed.setTimestamp(newMsg.editedTimestamp);
            
            this.setAuthor(embed, newMsg.author);
            embed.setTitle('Updated Message');
            embed.addField('Before', oldMsg.content || this.noneText);
            embed.addField('After', newMsg.content || this.noneText);
            embed.addField('Channel', newMsg.channel.toString(), true);
            embed.addField('Profile', newMsg.author.toString(), true);
            embed.addField('Message ID', newMsg.id, true);

            await (channel as TextChannel).send(embed);
        }
    }
}