import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';
import { DiscordUtil } from '../../../util/discord';

export class PrefixCommand extends Command {
    public name = 'prefix';
    public args = '(prefix)';
    public description = 'Sets the guild\'s prefix.';
    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;
    public cooldown = StandardCooldowns.medium;

    public async run({ bot, msg, content, guild }: CommandParameters) {
        const embed = bot.createEmbed({ footer: false, timestamp: false });
        
        let newPrefix = content;
        
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