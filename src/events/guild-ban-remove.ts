import { GuildBan, TextChannel } from 'discord.js';
import { EmbedTemplates } from 'panda-discord';

import { SpindaDiscordBot } from '../bot';
import { LogOptionBit } from '../data/model/guild';
import { BaseLogEvent } from './log';

export class GuildBanRemoveEvent extends BaseLogEvent<'guildBanRemove'> {
    constructor(bot: SpindaDiscordBot) {
        super(bot, 'guildBanRemove', LogOptionBit.MemberUpdated);
    }

    public async run(ban: GuildBan) {
        const channel = await this.getDestination(ban.guild.id);
        if (channel) {
            const embed = this.bot.createEmbed(EmbedTemplates.Log);
            this.setAuthor(embed, ban.user);
            embed.setDescription(ban.user.toString());
            embed.setTitle('Member Unbanned');

            await (channel as TextChannel).send({ embeds: [embed] });
        }
    }
}
