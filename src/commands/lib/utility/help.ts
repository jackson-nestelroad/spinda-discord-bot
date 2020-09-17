import { Command, CommandCategory, CommandPermission } from '../base';
import { DiscordBot } from '../../../bot';
import { Message } from 'discord.js';

export class HelpCommand implements Command {
    public name = 'help';
    public args = '(command)';
    public description = 'Gives information on how to use the bot or a given command.';
    public category = CommandCategory.Utility;
    public permission = CommandPermission.Everyone;

    // Cache for list of command names by category
    public commandListByCategory: Map<CommandCategory, string[]> = null;

    public async run(bot: DiscordBot, msg: Message, args: string[]) {
        const embed = bot.createEmbed();
        embed.setAuthor(bot.name + ' Commands', bot.iconUrl);
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
                        this.commandListByCategory.get(cmd.category).push(`${name} ${cmd.args}`);
                    }
                });
            }
            
            this.commandListByCategory.forEach((value, key) => {
                value = value.map(value => `${prefix}${value}`);
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

        await msg.channel.send(embed);
    }
}