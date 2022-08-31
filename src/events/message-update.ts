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
            embed.addFields(
                { name: 'Before', value: oldMsg.content || this.noneText },
                { name: 'After', value: newMsg.content || this.noneText },
                { name: 'Channel', value: newMsg.channel.toString(), inline: true },
                { name: 'Profile', value: newMsg.author.toString(), inline: true },
                { name: 'Message ID', value: newMsg.id, inline: true },
            );

            await channel.send({ embeds: [embed] });
        }
    }
}
