import { Command, CommandCategory, CommandPermission } from '../base';
import { DiscordBot } from '../../../bot';
import { Message, MessageEmbed } from 'discord.js';
import { SpindaColors } from '../spinda/spinda-colors';

export class HelpCommand implements Command {
    public names = ['help'];
    public args = '(command)';
    public description = 'Gives information on how to use the bot or a given command.';
    public category = CommandCategory.Utility;
    public permission = CommandPermission.Everyone;

    // Cache for list of command names by category
    public commandListByCategory: Map<CommandCategory, string[]> = null;

    public async run(bot: DiscordBot, msg: Message, args: string[]) {
        const embed = new MessageEmbed();
        embed.setColor(SpindaColors.spots.base.hexString);
        embed.setAuthor(bot.name + ' Commands', bot.iconUrl);
        embed.setFooter(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
        const prefix = bot.dataService.getGuildConfig(msg.guild.id).prefix;

        // Get all commands by category
        if (args.length === 0) {
            embed.setTitle('All Commands');

            if (!this.commandListByCategory) {
                this.commandListByCategory = new Map();
                bot.commands.forEach((cmd, name) => {
                    if (cmd.category !== CommandCategory.Secret) {
                        if (!this.commandListByCategory.has(cmd.category)) {
                            this.commandListByCategory.set(cmd.category, []);
                        }
                        this.commandListByCategory.get(cmd.category).push(`${prefix}${name} ${cmd.args}`);
                    }
                });
            }
            
            this.commandListByCategory.forEach((value, key) => {
                embed.addField(CommandCategory[key], value.join('\n'), true);
            });
        }
        // Show details for one command
        else {
            const needHelp = args[0];
            if (bot.commands.has(needHelp)) {
                const cmd = bot.commands.get(needHelp);
                embed.setTitle(`${prefix}${needHelp} ${cmd.args}`);
                embed.addField('Description', cmd.description);
                embed.addField('Category', CommandCategory[cmd.category], true);
                embed.addField('Permission', CommandPermission[cmd.permission], true);
            }
            else {
                embed.setTitle('No Command Found');
                embed.setDescription(`Command "${prefix}${needHelp}" does not exist.`);
            }
        }

        msg.channel.send(embed);
    }
}