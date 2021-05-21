import { CustomCommandData } from '../../../data/model/custom-command';
import { CustomCommandEngine } from '../../../events/util/custom-command';
import { DiscordUtil } from '../../../util/discord';
import { ExpireAgeConversion } from '../../../util/timed-cache';
import { ArgumentsConfig, ArgumentType, CommandCategory, CommandParameters, CommandPermission, ComplexCommand, StandardCooldowns } from '../base';

interface HelpArgs {
    query?: string;
}

export class HelpCommand extends ComplexCommand<HelpArgs> {
    public name = 'help';
    public description = 'Gives information on how to use the bot or a given command.';
    public category = CommandCategory.Utility;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Low;

    public args: ArgumentsConfig<HelpArgs> = {
        query: {
            description: 'Command category or individual command.',
            type: ArgumentType.String,
            required: false,
        },
    };

    // Cache for list of command names by category
    // Key is a lowercase, normalized version of the category name
    private commandListByCategory: Map<CommandCategory, string[]> = null;

    private customCommandString(data: CustomCommandData, prefix: string): string {
        return `${prefix}${data.name}${data.noContent ? '' : ` (${data.contentName})`}`;
    }

    public async run({ bot, src, guild }: CommandParameters, args: HelpArgs) {
        const embed = bot.createEmbed();
        embed.setAuthor(bot.name + ' Commands', bot.iconUrl);
        const prefix = guild.prefix;

        // Organize commands by category only once, since category shouldn't ever change
        if (!this.commandListByCategory) {
            this.commandListByCategory = new Map();
            bot.commands.forEach((cmd, name) => {
                if (!this.commandListByCategory.has(cmd.category)) {
                    this.commandListByCategory.set(cmd.category, []);
                }
                this.commandListByCategory.get(cmd.category).push(`${name} ${cmd.argsString()}`);
            });
        }

        // Blank, give all command categories
        if (!args.query) {
            embed.setTitle('All Command Categories');
            embed.setDescription(`You may also use \`@${bot.name} cmd\` to run any command. Most commands are also available as slash commands.\n\nUse \`${prefix}${this.name}\` to view commands in a specific category.`);

            embed.addField('Categories', Object.values(CommandCategory)
                .filter(category => category !== CommandCategory.Secret)
                .join('\n')
            );
        }
        else {
            const query = args.query;

            // Check if query is a category
            let matchedCategory: CommandCategory = null;
            for (const category of [...this.commandListByCategory.keys()]) {
                if (DiscordUtil.baseStringEqual(category, query)) {
                    matchedCategory = category;
                    break;
                }
            }

            // Query is a category
            if (matchedCategory !== null) {
                embed.setTitle(`${matchedCategory} Commands`);
                const commandsString = this.commandListByCategory.get(matchedCategory).map(value => `${prefix}${value}`).join('\n');
                embed.setDescription(commandsString);
            }
            // Query is the custom category, which gives guild-specific custom commands
            else if (DiscordUtil.baseStringEqual(CommandCategory.Custom, query)) {
                embed.setTitle(`${CommandCategory.Custom} Commands for ${src.guild.name}`);
                const customCommands = await bot.dataService.getCustomCommands(src.guild.id);
                const commandsString = Object.values(customCommands).map(data => `\`${prefix}${data.name}\``).join(', ');
                embed.setDescription(commandsString);
            }
            // Query is a global command
            else if (bot.commands.has(query)) {
                const cmd = bot.commands.get(query);
                embed.setTitle(`${prefix}${cmd.name} ${cmd.argsString()}`);
                embed.addField('Description', cmd.fullDescription());
                embed.addField('Category', cmd.category, true);
                embed.addField('Permission', CommandPermission[cmd.permission], true);
                embed.addField('Cooldown', cmd.cooldown ? ExpireAgeConversion.toString(cmd.cooldown) : 'None', true);
                if (cmd.args) {
                    const argumentsField: string[] = [];
                    for (const [name, data] of Object.entries(cmd.args)) {
                        argumentsField.push(`\`${name}\` - ${data.description}`);
                    }
                    embed.addField('Arguments', argumentsField.join('\n'), true);
                }
                if (cmd.addHelpFields) {
                    cmd.addHelpFields(embed);
                }
                if (cmd.examples && cmd.examples.length > 0) {
                    embed.addField('Examples', cmd.examples.map(example => `${prefix}${this.name} ${example}`).join('\n'));
                }
            }
            else {
                const customCommands = await bot.dataService.getCustomCommands(src.guild.id);

                // Query is a guild-specific custom command
                const customCommand = customCommands[query.toLowerCase()];
                if (customCommand) {
                    embed.setTitle(this.customCommandString(customCommand, prefix));
                    embed.addField('Description', customCommand.description);
                    embed.addField('Category', CommandCategory.Custom, true);
                    embed.addField('Permission', CommandPermission[CommandPermission.Everyone], true);
                    embed.addField('Cooldown', ExpireAgeConversion.toString(CustomCommandEngine.cooldownTime), true);
                    if (!customCommand.noContent) {
                        embed.addField('Arguments', `\`${customCommand.contentName}\` - ${customCommand.contentDescription}`, true);
                    }
                    embed.addField('Code', `\`${CustomCommandEngine.addMetadata(customCommand)}\``);
                }
                else {
                    embed.setTitle('No Command Found');
                    embed.setDescription(`Command "${prefix}${args.query}" does not exist.`);
                }
            }
        }

        await src.send(embed);
    }
}