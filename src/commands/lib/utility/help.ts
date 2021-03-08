import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';
import { DiscordUtil } from '../../../util/discord';
import { ExpireAgeConversion } from '../../../util/timed-cache';

export class HelpCommand extends Command {
    public name = 'help';
    public args = '(command)';
    public description = 'Gives information on how to use the bot or a given command.';
    public category = CommandCategory.Utility;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.low;

    // Cache for list of command names by category
    private commandListByCategory: Map<CommandCategory, string[]> = null;

    public async run({ bot, msg, args, guild }: CommandParameters) {
        const embed = bot.createEmbed();
        embed.setAuthor(bot.name + ' Commands', bot.iconUrl);
        const prefix = guild.prefix;

        if (!this.commandListByCategory) {
            this.commandListByCategory = new Map();
            bot.commands.forEach((cmd, name) => {
                if (!this.commandListByCategory.has(cmd.category)) {
                    this.commandListByCategory.set(cmd.category, []);
                }
                this.commandListByCategory.get(cmd.category).push(`${name} ${cmd.args}`);
            });
        }

        // Get all commands by category
        if (args.length === 0) {
            embed.setTitle('All Commands');
            embed.setDescription(`You may also use \`@${bot.name} cmd\` to run any command.`);
            
            this.commandListByCategory.forEach((value, key) => {
                if (key !== CommandCategory.Secret) {
                    value = value.map(value => `${prefix}${value}`);
                    embed.addField(key, value.join('\n'), true);
                }
            });
        }
        // Show details for one command or category
        else {
            const needHelp = args[0];
            let category: CommandCategory;
            if (bot.commands.has(needHelp)) {
                const cmd = bot.commands.get(needHelp);
                embed.setTitle(`${prefix}${needHelp} ${cmd.args}`);
                embed.addField('Description', cmd.description);
                embed.addField('Category', cmd.category, true);
                embed.addField('Permission', CommandPermission[cmd.permission], true);
                embed.addField('Cooldown', cmd.cooldown ? ExpireAgeConversion.toString(cmd.cooldown) : 'None', true);
                if (cmd.addHelpFields) {
                    cmd.addHelpFields(embed);
                }
            }
            else if (category = Object.values(CommandCategory).find(val => DiscordUtil.baseStringEqual(needHelp, val))) {
                embed.addField(category, this.commandListByCategory.get(category).map(value => `${prefix}${value}`).join('\n'));
            }
            else {
                embed.setTitle('No Command Found');
                embed.setDescription(`Command "${prefix}${needHelp}" does not exist.`);
            }
        }

        await msg.channel.send(embed);
    }
}