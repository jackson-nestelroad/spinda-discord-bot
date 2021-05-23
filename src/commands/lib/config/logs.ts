import { CommandCategory, CommandPermission, CommandParameters, StandardCooldowns, ComplexCommand, ArgumentsConfig, ArgumentType } from '../base';
import { TextChannel } from 'discord.js';
import { LogOptionBit } from '../../../data/model/guild';
import { EmbedTemplates } from '../../../util/embed';

enum LogCommandOption {
    Channel = 'channel',
    Enable = 'enable',
    Disable = 'disable',
    Reset = 'reset',
}

enum LogOptionType {
    Channel = 'channel',
    Boolean = 'boolean',
    Events = 'event1, event2, ...',
    None = 'none'
}

const LogEvents: { [name: string]: LogOptionBit } = {
    'member-joined': LogOptionBit.MemberJoined,
    'member-left': LogOptionBit.MemberLeft,
    'member-updated': LogOptionBit.MemberUpdated,
    'member-banned': LogOptionBit.MemberBanned,
    'member-unbanned': LogOptionBit.MemberUnbanned,
    'message-edited': LogOptionBit.MessageEdited,
    'message-deleted': LogOptionBit.MessageDeleted,
    'bulk-deleted': LogOptionBit.BulkMessageDeletion,
} as const;

type LogOptionMap = { [name: string]: LogOptionType[] };

interface LogsArgs {
    options?: string;
}

export class LogsCommand extends ComplexCommand<LogsArgs> {
    private readonly options: LogOptionMap = {
        [LogCommandOption.Channel]: [LogOptionType.Channel],
        [LogCommandOption.Enable]: [LogOptionType.None, LogOptionType.Events],
        [LogCommandOption.Disable]: [LogOptionType.None, LogOptionType.Events],
        [LogCommandOption.Reset]: [LogOptionType.None],
    };

    public name = 'logs';
    public description = 'Manages the guild\'s logging configuration.'
    public moreDescription = [
        `Available options: ${this.formatOptions()}`,
        `Available events: ${this.formatBitOptions()}`,
    ];
    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;
    public cooldown = StandardCooldowns.Medium;

    public args: ArgumentsConfig<LogsArgs> = {
        options: {
            description: 'Log options to change, in the format of "(option = value;)*".',
            type: ArgumentType.RestOfContent,
            required: false,
        },
    };

    private formatOptions(): string {
        return Object.entries(this.options)
            .map(([key, val]) => {
                const ways = [];
                for (const type of val) {
                    if (type === LogOptionType.None) {
                        ways.push(`\`${key};\``);
                    }
                    else {
                        ways.push(`\`${key} = [${type}];\``);
                    }
                }
                return ways.join('\n');
            }).join('\n');
    }

    private formatBitOptions(): string {
        return Object.keys(LogEvents).map(key => `\`${key}\``).join(', ');
    }

    public async run({ bot, src, guild }: CommandParameters, args: LogsArgs) {
        if (!args.options) {
            const embed = bot.createEmbed();
            embed.setTitle(`Log Configuration for ${src.guild.name}`);
            let fields = [];
            fields.push(`${LogCommandOption.Channel} = ${guild.logChannelId ? bot.client.channels.cache.get(guild.logChannelId)?.toString() ?? 'None' : 'None'}`);
            fields.push(`enabled = ${guild.logOptions & LogOptionBit.Enabled ? 'on' : 'off'}`);
            for (const [event, bit] of Object.entries(LogEvents)) {
                fields.push(`${event} = ${guild.logOptions & bit ? 'on' : 'off'}`);
            }
            embed.setDescription(fields.join('\n'));
            await src.send(embed);
        }
        else {
            const changes = args.options.split(';').map(val => val.trim());
            for (const change of changes) {
                const split = change.split('=').map(val => val.trim());

                if (split.length > 2 || split.length === 0) {
                    throw new Error(`Invalid format: \`${change}\``);
                }
                
                const option = split[0];
                const value = split.length === 2 ? split[1] : null;
                if (!option) {
                    break;
                }
                if (!this.options[option]) {
                    throw new Error(`Invalid option \`${option}\`. Use \`${guild.prefix}help logs\` to see list of options.`);
                }
                if (!value && !this.options[option].includes(LogOptionType.None)) {
                    throw new Error(`Invalid format: \`${change}\``);
                }

                switch (option as LogCommandOption) {
                    case LogCommandOption.Channel: {
                        const channel = bot.getChannelFromMention(value);
                        if (!channel) {
                            throw new Error(`Invalid channel: ${value} (\`${value}\`)`);
                        }
                        if (channel.type !== 'text') {
                            throw new Error('Log channel must be a text channel.');
                        }
                        if ((channel as TextChannel).guild.id !== src.guild.id) {
                            throw new Error('Log channel must be in this guild.');
                        }
                        if (!((channel as TextChannel).viewable && (channel as TextChannel).permissionsFor(bot.client.user).has(['SEND_MESSAGES']))) {
                            throw new Error(`Bot is missing permissions for ${value}.`);
                        }

                        guild.logChannelId = channel.id;
                    } break;

                    case LogCommandOption.Enable: {
                        if (!value) {
                            guild.logOptions |= LogOptionBit.Enabled;
                        }
                        // Given a list of options to enable
                        else {
                            const events = value.split(',').map(event => event.trim());
                            for (const event of events) {
                                if (!LogEvents[event]) {
                                    throw new Error(`Invalid event \`${event}\` in \`${option}\`. Use \`${guild.prefix}help logs\` to see list of events.`);
                                }
                                guild.logOptions |= LogEvents[event];
                            }
                        }
                    } break;

                    case LogCommandOption.Disable: {
                        if (!value) {
                            guild.logOptions &= ~LogOptionBit.Enabled;
                        }
                        // Given a list of options to enable
                        else {
                            const events = value.split(',').map(event => event.trim());
                            for (const event of events) {
                                if (!LogEvents[event]) {
                                    throw new Error(`Invalid event \`${event}\` in \`${option}\`. Use \`${guild.prefix}help logs\` to see list of events.`);
                                }
                                guild.logOptions &= ~LogEvents[event];
                            }
                        }
                    } break;

                    case LogCommandOption.Reset: {
                        guild.logChannelId = null;
                        guild.logOptions = 0;
                    } break;
                }
            }

            await bot.dataService.updateGuild(guild);
            const embed = bot.createEmbed(EmbedTemplates.Success);
            embed.setDescription('Successfully updated log configuration.');
            await src.send(embed);
        }
    }
}