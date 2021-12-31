import {
    ArgumentType,
    ArgumentsConfig,
    CommandCategoryUtil,
    CommandMap,
    CommandParameters,
    ComplexCommand,
    ExpireAgeConversion,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';
import { CustomCommandEngine } from '../../../custom-commands/custom-command-engine';
import { CustomCommandData, CustomCommandFlag } from '../../../data/model/custom-command';

interface HelpArgs {
    query?: string;
}

/**
 * Default help command for displaying commands by category.
 */
export class HelpCommand extends ComplexCommand<SpindaDiscordBot, HelpArgs> {
    public name = 'help';
    public description = 'Gives information on how to use the bot or a given command.';
    public category = CommandCategory.Utility;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Low;

    public args: ArgumentsConfig<HelpArgs> = {
        query: {
            description: 'Command category or individual command.',
            type: ArgumentType.RestOfContent,
            required: false,
        },
    };

    /**
     * Number of commands allowed in a single column before writing them
     * next to each other separated by commads.
     */
    protected readonly singleColumnLimit = 20;

    // Cache for list of command names by category.
    // Key is a lowercase, normalized version of the category name.
    private commandListByCategory: Map<string, Map<string, string>> = null;

    private addCommandsToCommandListByCategory(map: CommandMap<string>, nameChain: string[] = []): void {
        map.forEach((cmd, name) => {
            if (cmd.isNested && !cmd.flattenHelpForSubCommands) {
                nameChain.push(name);
                this.addCommandsToCommandListByCategory(cmd.subcommandMap, nameChain);
                nameChain.pop();
            } else {
                if (CommandCategoryUtil.isPublic(cmd.category)) {
                    const categoryName = CommandCategoryUtil.realName(cmd.category);
                    if (!this.commandListByCategory.has(categoryName)) {
                        this.commandListByCategory.set(categoryName, new Map());
                    }
                    const fullName = (nameChain.length > 0 ? nameChain.join(' ') + ' ' : '') + name;
                    this.commandListByCategory.get(categoryName).set(fullName, `${fullName} ${cmd.argsString()}`);
                }
            }
        });
    }

    private customCommandString(data: CustomCommandData, prefix: string): string {
        let str = prefix + data.name;
        if (!(data.flags & CustomCommandFlag.NoContent)) {
            str += ' ' + (data.flags & CustomCommandFlag.ContentRequired ? data.contentName : `(${data.contentName})`);
        }
        return str;
    }

    public async run({ bot, src, guildId }: CommandParameters<SpindaDiscordBot>, args: HelpArgs) {
        const embed = bot.createEmbed();
        embed.setAuthor(bot.name + ' Commands', bot.avatarUrl);
        const prefix = await bot.getPrefix(guildId);

        // Organize commands by category only once, since category shouldn't ever change.
        if (!this.commandListByCategory) {
            this.commandListByCategory = new Map();
            this.addCommandsToCommandListByCategory(bot.commands);
        }

        // Blank, give all public command categories.
        if (!args.query) {
            embed.setTitle('All Command Categories');
            embed.setDescription(
                `You may also use \`@${bot.name} cmd\` to run any command. Public commands are also available as slash commands.\n\nUse \`${prefix}${this.name}\` to view commands in a specific category.`,
            );

            embed.addField('Categories', [...this.commandListByCategory.keys(), CommandCategory.Custom].join('\n'));
        } else {
            const query = args.query;

            // Check if query is a category.
            let matchedCategory: string = null;
            for (const category of this.commandListByCategory.keys()) {
                if (category.localeCompare(query, undefined, { sensitivity: 'base' }) === 0) {
                    matchedCategory = category;
                    break;
                }
            }

            // Query is a category.
            if (matchedCategory !== null) {
                embed.setTitle(`${matchedCategory} Commands`);
                const categoryCommands = this.commandListByCategory.get(matchedCategory);
                let commandsString: string;
                if (categoryCommands.size <= this.singleColumnLimit) {
                    commandsString = [...categoryCommands.values()].map(value => `${prefix}${value}`).join('\n');
                } else {
                    commandsString = [...categoryCommands.keys()].map(value => `\`${prefix}${value}\``).join(', ');
                }
                embed.setDescription(commandsString);
            }
            // Query is the custom category.
            else if (CommandCategory.Custom.localeCompare(query, undefined, { sensitivity: 'base' }) === 0) {
                embed.setTitle(`${CommandCategory.Custom} Commands for ${src.guild.name}`);
                const customCommands = await bot.dataService.getCustomCommands(src.guild.id);
                const commandsString = Object.values(customCommands)
                    .map(data => `\`${prefix}${data.name}\``)
                    .join(', ');
                embed.setDescription(commandsString);
            }
            // Query is some global command.
            else {
                const queryList = query.split(' ');
                let cmd = bot.commands.get(queryList[0]);
                let i = 1;
                while (cmd && cmd.isNested && i < queryList.length) {
                    cmd = cmd.subcommandMap.get(queryList[i++]);
                }

                const fullName = queryList.slice(0, i).join(' ');
                if (cmd) {
                    embed.setTitle(`${prefix}${fullName} ${cmd.argsString()}`);
                    embed.addField('Description', cmd.fullDescription());
                    embed.addField('Category', CommandCategoryUtil.realName(cmd.category), true);
                    embed.addField('Permission', cmd.permission, true);
                    embed.addField(
                        'Cooldown',
                        cmd.cooldown ? ExpireAgeConversion.toString(cmd.cooldown) : 'None',
                        true,
                    );
                    if (cmd.args) {
                        const argumentsField: string[] = Object.entries(cmd.args)
                            .filter(([name, data]) => !data.hidden)
                            .map(([name, data]) => `\`${name}\` - ${data.description}`);
                        embed.addField('Arguments', argumentsField.join('\n'), true);
                    }
                    if (cmd.addHelpFields) {
                        cmd.addHelpFields(embed);
                    }
                    if (cmd.examples && cmd.examples.length > 0) {
                        embed.addField(
                            'Examples',
                            cmd.examples.map(example => `${prefix}${this.name} ${example}`).join('\n'),
                        );
                    }
                } else {
                    const customCommands = await bot.dataService.getCustomCommands(src.guild.id);

                    // Query is a guild-specific custom command
                    const customCommand = customCommands[query.toLowerCase()];
                    if (customCommand) {
                        embed.setTitle(this.customCommandString(customCommand, prefix));
                        embed.addField('Description', customCommand.description);
                        embed.addField('Category', CommandCategory.Custom, true);
                        embed.addField('Permission', CommandPermission[CommandPermission.Everyone], true);
                        embed.addField(
                            'Cooldown',
                            ExpireAgeConversion.toString(bot.customCommandService.cooldownTime),
                            true,
                        );
                        if (!(customCommand.flags & CustomCommandFlag.NoContent)) {
                            embed.addField(
                                'Arguments',
                                `\`${customCommand.contentName}\` - ${customCommand.contentDescription}`,
                                true,
                            );
                        }
                        embed.addField('Code', `\`${CustomCommandEngine.addMetadata(customCommand)}\``);
                    } else {
                        embed.setTitle('No Command Found');
                        embed.setDescription(`Command "${prefix}${args.query}" does not exist.`);
                    }
                }
            }
        }

        await src.send({ embeds: [embed] });
    }
}
