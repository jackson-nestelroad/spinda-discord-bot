import { PermissionFlagsBits } from 'discord.js';
import {
    ArgumentType,
    ArgumentsConfig,
    CommandParameters,
    ComplexCommand,
    EmbedTemplates,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';
import { LogOptionBit } from '../../../data/model/guild';
import { CommandOptions, OptionNameToTypes, OptionValueType } from '../../../util/command-options';

enum LogCommandOption {
    Channel = 'channel',
    Enable = 'enable',
    Disable = 'disable',
    Reset = 'reset',
}

const LogCommandOptionType = {
    ...OptionValueType,
    Events: '[event1, event2, ...]',
};

const LogEvents: { [name: string]: LogOptionBit } = {
    'member-joined': LogOptionBit.MemberJoined,
    'member-left': LogOptionBit.MemberLeft,
    'member-updated': LogOptionBit.MemberUpdated,
    'member-banned': LogOptionBit.MemberBanned,
    'member-unbanned': LogOptionBit.MemberUnbanned,
    'member-warned': LogOptionBit.MemberWarned,
    'message-edited': LogOptionBit.MessageEdited,
    'message-deleted': LogOptionBit.MessageDeleted,
    'bulk-deleted': LogOptionBit.BulkMessageDeletion,
} as const;

interface LogsArgs {
    options?: string;
}

export class LogsCommand extends ComplexCommand<SpindaDiscordBot, LogsArgs> {
    private readonly options: OptionNameToTypes = {
        [LogCommandOption.Channel]: [LogCommandOptionType.Channel],
        [LogCommandOption.Enable]: [LogCommandOptionType.None, LogCommandOptionType.Events],
        [LogCommandOption.Disable]: [LogCommandOptionType.None, LogCommandOptionType.Events],
        [LogCommandOption.Reset]: [LogCommandOptionType.None],
    };

    public name = 'logs';
    public description = "Manages the guild's logging configuration.";
    public moreDescription = [
        `Available options: ${CommandOptions.formatOptions(this.options)}`,
        `Available events: ${this.formatBitOptions()}`,
    ];
    public category = CommandCategory.Moderation;
    public permission = CommandPermission.Administrator;
    public cooldown = StandardCooldowns.Medium;

    public args: ArgumentsConfig<LogsArgs> = {
        options: {
            description: 'Log options to change, in the format of "(option = value;)*".',
            type: ArgumentType.RestOfContent,
            required: false,
        },
    };

    private formatBitOptions(): string {
        return Object.keys(LogEvents)
            .map(key => `\`${key}\``)
            .join(', ');
    }

    public async run({ bot, src, guildId }: CommandParameters<SpindaDiscordBot>, args: LogsArgs) {
        const guild = bot.dataService.getCachedGuild(guildId);
        if (!args.options) {
            const embed = bot.createEmbed();
            embed.setTitle(`Log Configuration for ${src.guild.name}`);
            const fields = [];
            fields.push(
                `${LogCommandOption.Channel} = ${
                    guild.logChannelId
                        ? bot.client.channels.cache.get(guild.logChannelId)?.toString() ?? 'None'
                        : 'None'
                }`,
            );
            fields.push(`enabled = ${guild.logOptions & LogOptionBit.Enabled ? 'on' : 'off'}`);
            for (const [event, bit] of Object.entries(LogEvents)) {
                fields.push(`${event} = ${guild.logOptions & bit ? 'on' : 'off'}`);
            }
            embed.setDescription(fields.join('\n'));
            await src.send({ embeds: [embed] });
        } else {
            const options = CommandOptions.parseOptions(args.options, this.options);
            for (const [option, value] of options) {
                if (!this.options[option]) {
                    throw new Error(
                        `Invalid option \`${option}\`. Use \`${guild.prefix}help logs\` to see list of options.`,
                    );
                }

                switch (option as LogCommandOption) {
                    case LogCommandOption.Channel:
                        {
                            const channel = bot.getChannelFromMention(value);
                            if (!channel) {
                                throw new Error(`Invalid channel: ${value} (\`${value}\`)`);
                            }
                            if (!channel.isTextBased() || channel.isDMBased()) {
                                throw new Error('Log channel must be a text channel.');
                            }
                            if (channel.guild.id !== src.guild.id) {
                                throw new Error('Log channel must be in this guild.');
                            }
                            if (
                                !(
                                    channel.viewable &&
                                    channel.permissionsFor(bot.client.user).has(PermissionFlagsBits.SendMessages)
                                )
                            ) {
                                throw new Error(`Bot is missing permissions for ${value}.`);
                            }

                            guild.logChannelId = channel.id;
                        }
                        break;

                    case LogCommandOption.Enable:
                        {
                            if (!value) {
                                guild.logOptions |= LogOptionBit.Enabled;
                            }
                            // Given a list of options to enable
                            else {
                                const events = value.split(',').map(event => event.trim());
                                for (const event of events) {
                                    if (!LogEvents[event]) {
                                        throw new Error(
                                            `Invalid event \`${event}\` in \`${option}\`. Use \`${guild.prefix}help logs\` to see list of events.`,
                                        );
                                    }
                                    guild.logOptions |= LogEvents[event];
                                }
                            }
                        }
                        break;

                    case LogCommandOption.Disable:
                        {
                            if (!value) {
                                guild.logOptions &= ~LogOptionBit.Enabled;
                            }
                            // Given a list of options to enable
                            else {
                                const events = value.split(',').map(event => event.trim());
                                for (const event of events) {
                                    if (!LogEvents[event]) {
                                        throw new Error(
                                            `Invalid event \`${event}\` in \`${option}\`. Use \`${guild.prefix}help logs\` to see list of events.`,
                                        );
                                    }
                                    guild.logOptions &= ~LogEvents[event];
                                }
                            }
                        }
                        break;

                    case LogCommandOption.Reset:
                        {
                            guild.logChannelId = null;
                            guild.logOptions = 0;
                        }
                        break;
                }
            }

            await bot.dataService.updateGuild(guild);
            const embed = bot.createEmbed(EmbedTemplates.Success);
            embed.setDescription('Successfully updated log configuration.');
            await src.send({ embeds: [embed] });
        }
    }
}
