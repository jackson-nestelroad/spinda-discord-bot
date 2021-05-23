import { TextChannel, GuildBan } from 'discord.js';
import { BaseLogEvent } from './base';
import { DiscordBot } from '../bot';
import { LogOptionBit } from '../data/model/guild';
import { EmbedTemplates } from '../util/embed';

const event = 'guildBanAdd';

export class GuildBanAddEvent extends BaseLogEvent<typeof event> {
    constructor(bot: DiscordBot) {
        super(bot, event, LogOptionBit.MemberUpdated);
    }
    
    public async run(ban: GuildBan) {
        const channel = await this.getDestination(ban.guild.id);
        if (channel) {
            const embed = this.bot.createEmbed(EmbedTemplates.Log);
            this.setAuthor(embed, ban.user);
            embed.setDescription(ban.user.toString());
            embed.setTitle('Member Banned');

            embed.addField('Reason', ban.reason);

            await (channel as TextChannel).send(embed);
        }
    }
}