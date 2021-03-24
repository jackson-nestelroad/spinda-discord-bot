import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';
import { DiscordUtil } from '../../../util/discord';
import { EmbedTemplates } from '../../../util/embed';
import { MessageEmbed } from 'discord.js';

export class PrefixCommand extends Command {
    public name = 'prefix';
    public args = '(prefix)';
    public description = 'Sets the guild\'s prefix.';
    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;
    public cooldown = StandardCooldowns.Medium;

    public async run({ bot, msg, content, guild }: CommandParameters) {        
        let newPrefix = content;
        
        const codeLine = DiscordUtil.getCodeLine(newPrefix);
        if (codeLine.match) {
            newPrefix = codeLine.content;
        }

        let embed: MessageEmbed;
        if (!newPrefix) {
            embed = bot.createEmbed(EmbedTemplates.Bare);
            embed.setDescription(`The prefix for this guild is \`${guild.prefix}\``);
        }
        else {
            embed = bot.createEmbed(EmbedTemplates.Success);
            guild.prefix = newPrefix;
            await bot.dataService.updateGuild(guild);
            embed.setDescription(`Changed guild prefix to \`${guild.prefix}\``);
        }
        await msg.channel.send(embed);
    }
}