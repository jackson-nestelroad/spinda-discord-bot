import { GuildMember } from 'discord.js';
import {
    ArgumentType,
    ArgumentsConfig,
    CommandParameters,
    ComplexCommand,
    EmbedTemplates,
    NestedCommand,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';
import { CommandOptions, OptionNameToTypes, OptionValueType } from '../../../util/command-options';

enum WarningConfigOption {
    TimeoutPerWarning = 'timeout-length-hours',
    WarningsToTimeout = 'begin-timeouts-at',
    WarningsToBan = 'ban-at',
}

const WarningConfigOptionType = {
    ...OptionValueType,
    Unset: 'unset',
};

interface WarningConfigArgs {
    options?: string;
}

export class WarningConfigSubCommand extends ComplexCommand<SpindaDiscordBot, WarningConfigArgs> {
    private readonly options: OptionNameToTypes = {
        [WarningConfigOption.TimeoutPerWarning]: [WarningConfigOptionType.Number, WarningConfigOptionType.Unset],
        [WarningConfigOption.WarningsToTimeout]: [WarningConfigOptionType.Number, WarningConfigOptionType.Unset],
        [WarningConfigOption.WarningsToBan]: [WarningConfigOptionType.Number, WarningConfigOptionType.Unset],
    };

    public name = 'config';
    public description = "Manages the guild's warning configuration.";
    public moreDescription = [
        `Available options: ${CommandOptions.formatOptions(this.options)}`,
        'When a user receives a warning, these options are checked as follows:',
        `If the user has received at least the number of warnings indicated by \`${WarningConfigOption.WarningsToBan}\`, the user is permanently banned.`,
        `If the user has received at least the number of warnings indicated by \`${WarningConfigOption.WarningsToTimeout}\` the user is timed out for \`${WarningConfigOption.TimeoutPerWarning}\` hours muliplied by the number of warnings over \`${WarningConfigOption.WarningsToTimeout}\`.`,
        `If \`${WarningConfigOption.WarningsToBan}\` is unset, then permanent bans are not used. If either \`${WarningConfigOption.WarningsToTimeout}\` or \`${WarningConfigOption.TimeoutPerWarning}\` are unset, then timeouts are not used.`,
    ];
    public category = CommandCategory.Inherit;
    public permission = CommandPermission.Inherit;

    public args: ArgumentsConfig<WarningConfigArgs> = {
        options: {
            description: 'Warning options to change, in the format of "(option = value;)*".',
            type: ArgumentType.RestOfContent,
            required: false,
        },
    };

    public async run({ bot, src, guildId }: CommandParameters<SpindaDiscordBot>, args: WarningConfigArgs) {
        const guild = bot.dataService.getCachedGuild(guildId);
        if (!args.options) {
            const embed = bot.createEmbed();
            embed.setTitle(`Warning Configuration for ${src.guild.name}`);
            const fields = [
                `${WarningConfigOption.TimeoutPerWarning} = ${
                    guild.timeoutPerWarning ?? WarningConfigOptionType.Unset
                }`,
                `${WarningConfigOption.WarningsToTimeout} = ${
                    guild.warnsToBeginTimeouts ?? WarningConfigOptionType.Unset
                }`,
                `${WarningConfigOption.WarningsToBan} = ${guild.warnsToBan ?? WarningConfigOptionType.Unset}`,
            ];
            embed.setDescription(fields.join('\n'));
            await src.send({ embeds: [embed] });
        } else {
            const options = CommandOptions.parseOptions(args.options, this.options);
            for (const [option, value] of options) {
                if (!this.options[option]) {
                    throw new Error(
                        `Invalid option \`${option}\`. Use \`/help warnings config\` to see list of options.`,
                    );
                }

                let valueToSet: number | null;
                if (WarningConfigOptionType.Unset.localeCompare(value, undefined, { sensitivity: 'base' }) === 0) {
                    valueToSet = null;
                } else {
                    valueToSet = parseInt(value);
                    if (isNaN(valueToSet)) {
                        throw new Error(`Invalid value for option \`${option}\`. Value must be a number.`);
                    }
                }

                switch (option as WarningConfigOption) {
                    case WarningConfigOption.TimeoutPerWarning:
                        {
                            guild.timeoutPerWarning = valueToSet;
                        }
                        break;
                    case WarningConfigOption.WarningsToTimeout:
                        {
                            guild.warnsToBeginTimeouts = valueToSet;
                        }
                        break;
                    case WarningConfigOption.WarningsToBan:
                        {
                            guild.warnsToBan = valueToSet;
                        }
                        break;
                }
            }

            await bot.dataService.updateGuild(guild);
            const embed = bot.createEmbed(EmbedTemplates.Success);
            embed.setDescription('Successfully updated warning configuration.');
            await src.send({ embeds: [embed] });
        }
    }
}

interface WarningDeleteArgs {
    id: number;
}

export class WarningDeleteSubCommand extends ComplexCommand<SpindaDiscordBot, WarningDeleteArgs> {
    public name = 'delete';
    public description = 'Deletes a specific warning.';
    public category = CommandCategory.Inherit;
    public permission = CommandPermission.Inherit;

    public args: ArgumentsConfig<WarningDeleteArgs> = {
        id: {
            description: 'Warning ID.',
            type: ArgumentType.Integer,
            required: true,
        },
    };

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>, args: WarningDeleteArgs) {
        await src.deferReply();

        const deleted = await bot.dataService.deleteWarning(args.id, src.guildId);
        if (!deleted) {
            const embed = bot.createEmbed(EmbedTemplates.Error);
            embed.setDescription('Warning does not exist in this guild.');
            await src.reply({ embeds: [embed] });
            return;
        }

        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(`Deleted warning #${args.id}.`);
        await src.reply({ embeds: [embed] });
    }
}

interface WarningViewArgs {
    id: number;
}

export class WarningViewSubCommand extends ComplexCommand<SpindaDiscordBot, WarningViewArgs> {
    public name = 'view';
    public description = 'Views a specific warning.';
    public category = CommandCategory.Inherit;
    public permission = CommandPermission.Inherit;

    public args: ArgumentsConfig<WarningViewArgs> = {
        id: {
            description: 'Warning ID.',
            type: ArgumentType.Integer,
            required: true,
        },
    };

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>, args: WarningViewArgs) {
        await src.deferReply();

        const warning = await bot.dataService.getWarning(args.id, src.guildId);
        if (!warning) {
            const embed = bot.createEmbed(EmbedTemplates.Error);
            embed.setDescription('Warning does not exist in this guild.');
            await src.reply({ embeds: [embed] });
            return;
        }

        const embed = bot.createEmbed(EmbedTemplates.Warning);
        embed.setTitle(`Warning #${warning.id}`);
        embed.setDescription(`<@${warning.userId}>`);
        embed.setTimestamp(warning.date);
        embed.addFields(
            { name: 'Reason', value: warning.reason },
            { name: 'Issuer', value: `<@${warning.issuerId}>`, inline: true },
        );
        await src.reply({ embeds: [embed] });
    }
}

interface WarningClearArgs {
    user: GuildMember;
}

export class WarningClearSubCommand extends ComplexCommand<SpindaDiscordBot, WarningClearArgs> {
    public name = 'clear';
    public description = 'Clears all warnings for a user.';
    public category = CommandCategory.Inherit;
    public permission = CommandPermission.Inherit;

    public args: ArgumentsConfig<WarningClearArgs> = {
        user: {
            description: 'User.',
            type: ArgumentType.User,
            required: true,
        },
    };

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>, args: WarningClearArgs) {
        await src.deferReply();

        const removed = await bot.dataService.clearWarnings(src.guildId, args.user.id);
        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(`Removed ${removed} warning${removed === 1 ? '' : 's'} from ${args.user.toString()}.`);
        await src.reply({ embeds: [embed] });
    }
}

interface WarningUserArgs {
    user: GuildMember;
    page?: number;
}

export class WarningUserSubCommand extends ComplexCommand<SpindaDiscordBot, WarningUserArgs> {
    private readonly pageSize = 10;

    public name = 'user';
    public description = 'Views all warnings for a user.';
    public category = CommandCategory.Inherit;
    public permission = CommandPermission.Inherit;

    public args: ArgumentsConfig<WarningUserArgs> = {
        user: {
            description: 'User.',
            type: ArgumentType.User,
            required: true,
        },
        page: {
            description: 'Page number to view, starting at 1.',
            type: ArgumentType.Integer,
            required: false,
            default: 1,
            transformers: {
                any: (value, result) => {
                    result.value = value - 1;
                    if (result.value < 0) {
                        result.error = 'Invalid page number.';
                    }
                },
            },
        },
    };

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>, args: WarningUserArgs) {
        await src.deferReply();

        const warnings = await bot.dataService.getWarnings(src.guildId, args.user.id);

        const embed = bot.createEmbed(EmbedTemplates.Bare);
        embed.setTitle('Warnings');
        const description = [args.user.toString(), ''];

        const lastPageNumber = Math.ceil(warnings.length / 10) - 1;
        const pageNumber = Math.min(args.page, lastPageNumber);

        if (warnings.length === 0) {
            description.push('None!');
        } else {
            const index = pageNumber * this.pageSize;
            description.push(`**Page ${pageNumber + 1}/${lastPageNumber + 1}**`);
            description.push(
                ...warnings
                    .slice(index, index + this.pageSize)
                    .map(warning => `#${warning.id} (${warning.date.toLocaleDateString()}) - "${warning.reason}"`),
            );
        }

        embed.setDescription(description.join('\n'));
        await src.send({ embeds: [embed] });
    }
}

interface WarningUserIdArgs {
    id: string;
    page?: number;
}

export class WarningUserIdSubCommand extends ComplexCommand<SpindaDiscordBot, WarningUserIdArgs> {
    private readonly pageSize = 10;

    public name = 'userid';
    public description = 'Views all warnings for a user by user ID (useful when member is no longer in guild).';
    public category = CommandCategory.Inherit;
    public permission = CommandPermission.Inherit;

    public args: ArgumentsConfig<WarningUserIdArgs> = {
        id: {
            description: 'User ID.',
            type: ArgumentType.String,
            required: true,
        },
        page: {
            description: 'Page number to view, starting at 1.',
            type: ArgumentType.Integer,
            required: false,
            default: 1,
            transformers: {
                any: (value, result) => {
                    result.value = value - 1;
                    if (result.value < 0) {
                        result.error = 'Invalid page number.';
                    }
                },
            },
        },
    };

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>, args: WarningUserIdArgs) {
        await src.deferReply();

        const warnings = await bot.dataService.getWarnings(src.guildId, args.id);

        const embed = bot.createEmbed(EmbedTemplates.Bare);
        embed.setTitle('Warnings');
        const description = [`<@${args.id}>`, ''];

        const lastPageNumber = Math.ceil(warnings.length / 10) - 1;
        const pageNumber = Math.min(args.page, lastPageNumber);

        if (warnings.length === 0) {
            description.push('None!');
        } else {
            const index = pageNumber * this.pageSize;
            description.push(`**Page ${pageNumber + 1}/${lastPageNumber + 1}**`);
            description.push(
                ...warnings
                    .slice(index, index + this.pageSize)
                    .map(warning => `#${warning.id} (${warning.date.toLocaleDateString()}) - "${warning.reason}"`),
            );
        }

        embed.setDescription(description.join('\n'));
        await src.send({ embeds: [embed] });
    }
}

export class WarningsCommand extends NestedCommand<SpindaDiscordBot> {
    public name = 'warnings';
    public description = 'Gives information about user warnings.';
    public category = CommandCategory.Moderation;
    public permission = CommandPermission.Moderator;
    public cooldown = StandardCooldowns.Low;

    public initializeShared() {}

    public subcommands = [
        WarningClearSubCommand,
        WarningConfigSubCommand,
        WarningDeleteSubCommand,
        WarningUserSubCommand,
        WarningUserIdSubCommand,
        WarningViewSubCommand,
    ];
}