import { EmbedType } from 'panda-discord';

import { SpindaDiscordBot } from '../bot';
import { LogOptionBit } from '../data/model/guild';
import { WarningAttributes } from '../data/model/warning';
import { BaseLogEvent } from './log';

export class GuildMemberWarnedEvent extends BaseLogEvent<'guildMemberWarned'> {
    constructor(bot: SpindaDiscordBot) {
        super(bot, 'guildMemberWarned', LogOptionBit.MemberWarned);
    }

    public async run(warning: WarningAttributes) {
        const channel = await this.getDestination(warning.guildId);
        if (channel) {
            const embed = this.bot.createEmbed({
                footer: true,
                timestamp: true,
                type: EmbedType.Warning,
            });

            const user = this.bot.client.users.cache.get(warning.userId);

            this.setAuthor(embed, user);
            embed.setDescription(user.toString());
            embed.setTitle('Member Warned');

            embed.addFields(
                { name: 'Reason', value: warning.reason },
                { name: 'Warning ID', value: warning.id.toString(), inline: true },
                { name: 'Issuer', value: warning.issuerId, inline: true },
            );

            await channel.send({ embeds: [embed] });
        }
    }
}
