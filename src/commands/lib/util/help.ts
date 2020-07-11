import { Command, CommandCategory, CommandPermission } from '../base';
import { DiscordBot } from '../../../bot';
import { Message, MessageEmbed } from 'discord.js';
import { SpindaColors } from '../spinda/spinda-colors';

// Get number => string from enum
const categories: Map<number, string> = Object.entries(CommandCategory)
    .filter(([key, val]) => !isNaN(Number(key)))
    .reduce((map, [key, val]) => {
        map.set(Number(key), val as string);
        return map;
    }, new Map());

export class HelpCommand implements Command {
    public names = ['help'];
    public args = '(command)';
    public description = 'Gives information on how to use the bot or a given command.';
    public category = CommandCategory.Utility;
    public permission = CommandPermission.Everyone;

    public async run(bot: DiscordBot, msg: Message, args: string[]) {
        const embed = new MessageEmbed();
        embed.setColor(SpindaColors.spots.base.hexString);
        embed.setAuthor(bot.name + ' Commands', bot.iconUrl);
        embed.setFooter(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
        const prefix = bot.dataService.getGuildConfig(msg.guild.id).prefix;

        // Get all commands by category
        if (args.length === 0) {
            embed.setTitle('All Commands');
            const commandListByCategory: Map<number, string[]> = new Map();
            bot.commands.forEach((cmd, name) => {
                if (cmd.category !== CommandCategory.Secret) {
                    if (!commandListByCategory.has(cmd.category)) {
                        commandListByCategory.set(cmd.category, []);
                    }
                    commandListByCategory.get(cmd.category).push(`${prefix}${name} ${cmd.args}`);
                }
            });
            commandListByCategory.forEach((value, key) => {
                embed.addField(categories.get(key), value.join('\n'), true);
            });
        }
        // Show details for one command
        else {
            const needHelp = args[0];
            if (bot.commands.has(needHelp)) {
                const cmd = bot.commands.get(needHelp);
                embed.setTitle(`${prefix}${needHelp} ${cmd.args}`);
                embed.addField('Description', cmd.description);
                embed.addField('Category', categories.get(cmd.category));
                embed.addField('Permission', CommandPermission[cmd.permission]);
            }
            else {
                embed.setTitle('No Command Found');
                embed.setDescription(`Command "${prefix}${needHelp}" does not exist.`);
            }
        }

        msg.channel.send(embed);
    }
}