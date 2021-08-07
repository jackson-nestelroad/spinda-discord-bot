import { Message, TextChannel } from 'discord.js';
import { EmbedTemplates } from 'panda-discord';

import { SpindaDiscordBot } from '../bot';
import { LogOptionBit } from '../data/model/guild';
import { BaseLogEvent } from './log';

export class MessageUpdateEvent extends BaseLogEvent<'messageUpdate'> {
    private readonly noneText = 'None';

    constructor(bot: SpindaDiscordBot) {
        super(bot, 'messageUpdate', LogOptionBit.MessageEdited);
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

            await (channel as TextChannel).send({ embeds: [embed] });
        }
    }
}
