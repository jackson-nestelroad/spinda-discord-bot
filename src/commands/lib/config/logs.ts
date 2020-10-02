import { Command, CommandCategory, CommandPermission } from '../base';
import { DiscordBot } from '../../../bot';
import { Message, TextChannel } from 'discord.js';
import { GuildAttributes } from '../../../data/model/guild';
import { DiscordUtil } from '../../../util/discord';

enum LogOption {
    Channel = 'channel',
    Deleted = 'deleted',
    Reset = 'reset',
}

type LogOptionType = 'channel' | 'boolean' | 'none';
type LogOptionMap = { [name: string]: LogOptionType };

export class LogsCommand implements Command {
    private readonly options: LogOptionMap = {
        [LogOption.Channel]: 'channel',
        [LogOption.Deleted]: 'boolean',
        [LogOption.Reset]: 'none',
    } as const;

    public name = 'logs';
    public args = '(setting = value;)*';
    public description = `
Manages the guild's logging configuration.

Available options:
${Object.entries(this.options).map(([key, val]) => val === 'none' ? `\`${key}\`` : `\`${key} = [${val}]\``).join('\n')}
`;

    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;

    private valueIsTrue(str: string): boolean {
        return DiscordUtil.baseStringEqual(str, 'true');
    }

    public async run(bot: DiscordBot, msg: Message, args: string[], guild: GuildAttributes) {
        if (args.length === 0) {
            const embed = bot.createEmbed();
            embed.setTitle(`Log Configuration for ${msg.guild.name}`);
            let fields = [];
            fields.push(`${LogOption.Channel} = ${guild.logChannelId ? bot.client.channels.cache.get(guild.logChannelId)?.toString() ?? 'None' : 'None'}`);
            fields.push(`${LogOption.Deleted} = ${guild.logDeletedMessages}`);
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
                if (!this.options[option]) {
                    throw new Error(`Invalid option \`${option}\`. Use \`>help logs\` to see list of options.`);
                }
                if (this.options[option] !== 'none' && !value) {
                    throw new Error(`Invalid format: \`${change}\``);
                }

                switch (option as LogOption) {
                    case LogOption.Channel: {
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
                        if (!(channel as TextChannel).viewable && (channel as TextChannel).permissionsFor(bot.client.user).has(['SEND_MESSAGES'])) {
                            throw new Error(`Bot is missing permissions for ${value}.`);
                        }

                        guild.logChannelId = channel.id;
                    } break;

                    case LogOption.Deleted: {
                        guild.logDeletedMessages = this.valueIsTrue(value);
                    } break;

                    case LogOption.Reset: {
                        guild.logChannelId = null;
                        guild.logDeletedMessages = false;
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