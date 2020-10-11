import { Command, CommandCategory, CommandPermission } from '../base';
import { DiscordBot } from '../../../bot';
import { Message, TextChannel } from 'discord.js';
import { GuildAttributes, LogOptionBit } from '../../../data/model/guild';

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
    'message-deleted': LogOptionBit.MessageDeleted,
} as const;

type LogOptionMap = { [name: string]: LogOptionType[] };


export class LogsCommand implements Command {
    private readonly options: LogOptionMap = {
        [LogCommandOption.Channel]: [LogOptionType.Channel],
        [LogCommandOption.Enable]: [LogOptionType.None, LogOptionType.Events],
        [LogCommandOption.Disable]: [LogOptionType.None, LogOptionType.Events],
        [LogCommandOption.Reset]: [LogOptionType.None],
    };

    public name = 'logs';
    public args = '(option = value;)*';
    public description = `
Manages the guild's logging configuration.

Available options:
${this.formatOptions()}

Available events:
${this.formatBitOptions()}
`;

    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;

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

    public async run(bot: DiscordBot, msg: Message, args: string[], guild: GuildAttributes) {
        if (args.length === 0) {
            const embed = bot.createEmbed();
            embed.setTitle(`Log Configuration for ${msg.guild.name}`);
            let fields = [];
            fields.push(`${LogCommandOption.Channel} = ${guild.logChannelId ? bot.client.channels.cache.get(guild.logChannelId)?.toString() ?? 'None' : 'None'}`);
            fields.push(`enabled = ${guild.logOptions & LogOptionBit.Enabled ? 'on' : 'off'}`);
            for (const [event, bit] of Object.entries(LogEvents)) {
                fields.push(`${event} = ${guild.logOptions & bit ? 'on' : 'off'}`);
            }
            embed.setDescription(fields.join('\n'));
            await msg.channel.send(embed);
        }
        else {
            const changes = args.join(' ').split(';').map(val => val.trim());
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
                        if ((channel as TextChannel).guild.id !== msg.guild.id) {
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
            const embed = bot.createEmbed({ success: true });
            embed.setDescription('Successfully updated log configuration.');
            await msg.channel.send(embed);
        }
    }
}