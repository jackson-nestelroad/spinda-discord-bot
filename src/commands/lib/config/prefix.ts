import { Command, CommandCategory, CommandPermission } from '../base';
import { DiscordBot } from '../../../bot';
import { Message } from 'discord.js';
import { GuildAttributes } from '../../../data/model/guild';
import { DiscordUtil } from '../../../util/discord';

export class PrefixCommand implements Command {
    public name = 'prefix';
    public args = '(prefix)';
    public description = 'Sets the guild\'s prefix.';
    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;

    public async run(bot: DiscordBot, msg: Message, args: string[], guild: GuildAttributes) {
        const embed = bot.createEmbed({ footer: false, timestamp: false });
        
        let newPrefix = args.join(' ');
        
        const codeLine = DiscordUtil.getCodeLine(newPrefix);
        if (codeLine.match) {
            newPrefix = codeLine.content;
        }

        if (!newPrefix) {
            embed.setDescription(`The prefix for this guild is \`${guild.prefix}\``);
        }
        else {
            guild.prefix = newPrefix;
            await bot.dataService.updateGuild(guild);
            embed.setDescription(`Changed guild prefix to \`${guild.prefix}\``);
        }
        await msg.channel.send(embed);
    }
}