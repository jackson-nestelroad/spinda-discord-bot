import { GuildMember } from 'discord.js';
import moment from 'moment';
import {
    ArgumentType,
    ArgumentsConfig,
    CommandParameters,
    ComplexCommand,
    EmbedTemplates,
    GuildMemberContextMenuCommand,
    InteractionCommandParameters,
    NestedCommand,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';
import { CommandOptions, OptionNameToTypes, OptionValueType } from '../../../util/command-options';

enum WarningConfigOption {
    TimeoutSequence = 'timeout-sequence',
    WarningsToTimeout = 'begin-timeouts-at',
    WarningsToBan = 'ban-at',
}

const WarningConfigOptionType = {
    ...OptionValueType,
    TimeoutSequence: '1 hour,6 hours,7 days,...',
    Unset: 'unset',
};

interface WarningConfigArgs {
    options?: string;
}

export class WarningConfigSubCommand extends ComplexCommand<SpindaDiscordBot, WarningConfigArgs> {
    static readonly timeoutSequenceSeparator: string = ',';

    private readonly options: OptionNameToTypes = {
        [WarningConfigOption.TimeoutSequence]: [WarningConfigOptionType.TimeoutSequence, WarningConfigOptionType.Unset],
        [WarningConfigOption.WarningsToTimeout]: [WarningConfigOptionType.Number, WarningConfigOptionType.Unset],
        [WarningConfigOption.WarningsToBan]: [WarningConfigOptionType.Number, WarningConfigOptionType.Unset],
    };

    public name = 'config';
    public description = "Manages the guild's warning configuration.";
    public moreDescription = [
        `Available options: ${CommandOptions.formatOptions(this.options)}`,
        'When a user receives a warning, these options are checked as follows:',
        `If the user has received at least the number of warnings indicated by \`${WarningConfigOption.WarningsToBan}\`, the user is permanently banned.`,
        `If the user has received at least the number of warnings indicated by \`${WarningConfigOption.WarningsToTimeout}\` the user is timed out for the duration listed in \`${WarningConfigOption.TimeoutSequence}\`, according to the number of warnings over \`${WarningConfigOption.WarningsToTimeout}\`.`,
        `If \`${WarningConfigOption.WarningsToBan}\` is unset, then permanent bans are not used. If either \`${WarningConfigOption.WarningsToTimeout}\` or \`${WarningConfigOption.TimeoutSequence}\` are unset, then timeouts are not used.`,
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

    private parseNumber(option: string, value: string): number {
        const num = parseInt(value);
        if (isNaN(num)) {
            throw new Error(`Invalid value for option \`${option}\`. Value must be a number.`);
        }
        return num;
    }

    public async run({ bot, src, guildId }: CommandParameters<SpindaDiscordBot>, args: WarningConfigArgs) {
        const guild = bot.dataService.getCachedGuild(guildId);
        if (!args.options) {
            const embed = bot.createEmbed();
            embed.setTitle(`Warning Configuration for ${src.guild.name}`);
            const fields = [
                `${WarningConfigOption.TimeoutSequence} = ${guild.timeoutSequence ?? WarningConfigOptionType.Unset}`,
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

                const valueIsNone =
                    WarningConfigOptionType.Unset.localeCompare(value, undefined, { sensitivity: 'base' }) === 0;

                switch (option as WarningConfigOption) {
                    case WarningConfigOption.TimeoutSequence:
                        {
                            if (valueIsNone) {
                                guild.timeoutSequence = null;
                            } else {
                                const timeoutSequence = value.split(WarningConfigSubCommand.timeoutSequenceSeparator);
                                for (const timeout of timeoutSequence) {
                                    const duration = moment.duration(...timeout.trim().split(' '));
                                    if (!duration.isValid() || duration.asMinutes() <= 1) {
                                        throw new Error(`Invalid timeout length: \`${timeout}\`.`);
                                    }
                                }
                                guild.timeoutSequence = timeoutSequence
                                    .map(duration => duration.trim())
                                    .filter(duration => duration.length > 0)
                                    .join(WarningConfigSubCommand.timeoutSequenceSeparator);
                            }
                        }
                        break;
                    case WarningConfigOption.WarningsToTimeout:
                        {
                            guild.warnsToBeginTimeouts = valueIsNone
                                ? null
                                : this.parseNumber(WarningConfigOption.WarningsToTimeout, value);
                        }
                        break;
                    case WarningConfigOption.WarningsToBan:
                        {
                            guild.warnsToBan = valueIsNone
                                ? null
                                : this.parseNumber(WarningConfigOption.WarningsToBan, value);
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
    ephemeral: boolean;
}

class WarningViewContextMenuCommand extends GuildMemberContextMenuCommand<SpindaDiscordBot, WarningUserArgs> {
    public name = 'View Warnings';

    public async run(params: InteractionCommandParameters<SpindaDiscordBot>, member: GuildMember) {
        await this.command.run(
            params,
            await this.command.parseArguments(params, {}, { user: member, ephemeral: true }),
        );
    }
}

export class WarningUserSubCommand extends ComplexCommand<SpindaDiscordBot, WarningUserArgs> {
    private readonly pageSize = 10;

    public name = 'user';
    public description = 'Views all warnings for a user.';
    public category = CommandCategory.Inherit;
    public permission = CommandPermission.Inherit;

    public contextMenu = [WarningViewContextMenuCommand];

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
        ephemeral: {
            description: 'Respond with an ephemeral message.',
            type: ArgumentType.Boolean,
            required: false,
            named: true,
            hidden: true,
            default: false,
        },
    };

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>, args: WarningUserArgs) {
        await src.deferReply(args.ephemeral);

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
        await src.send({ embeds: [embed], ephemeral: args.ephemeral });
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

    public subcommands = [
        WarningClearSubCommand,
        WarningConfigSubCommand,
        WarningDeleteSubCommand,
        WarningUserSubCommand,
        WarningUserIdSubCommand,
        WarningViewSubCommand,
    ];
}
