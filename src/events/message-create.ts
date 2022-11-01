import { Message } from 'discord.js';
import {
    BaseEvent,
    ChatCommandParameters,
    CommandSource,
    MessageCommandSource,
    NamedArgsOption,
    SplitArgumentArray,
} from 'panda-discord';

import { CommandPermission, SpindaDiscordBot } from '../bot';
import { GuildAttributes } from '../data/model/guild';

export class MessageCreateEvent extends BaseEvent<'messageCreate', SpindaDiscordBot> {
    private forbiddenMentionRegex = /@(everyone|here)/g;

    constructor(bot: SpindaDiscordBot) {
        super(bot, 'messageCreate');
    }

    private async runCommand(content: string, msg: Message, guild: GuildAttributes) {
        content = content.replace(this.forbiddenMentionRegex, '@\u{200b}$1');

        const src = new CommandSource(msg);
        let args: SplitArgumentArray;
        try {
            args = this.bot.splitIntoArgs(content);
        } catch (error) {
            await this.bot.sendError(src, error);
            return;
        }

        // No command
        if (args.length === 0) {
            return;
        }

        const cmd = args.shift();
        content = content.substring(cmd.length).trim();

        const params: ChatCommandParameters<SpindaDiscordBot> = {
            bot: this.bot,
            src: new CommandSource(msg) as MessageCommandSource,
            args,
            content,
            guildId: guild.id,
            extraArgs: {},
        };

        // Global command
        if (this.bot.commands.has(cmd)) {
            try {
                const command = this.bot.commands.get(cmd);
                if (command.disableChat) {
                    return;
                }
                if (this.bot.validate(params, command)) {
                    await command.executeChat(params);
                }
            } catch (error) {
                await this.bot.sendError(params.src, error);
            }
        }
        // Could be a custom (guild) command
        else {
            const customCommands = await this.bot.dataService.getCustomCommands(params.src.guild.id);
            const customCommand = customCommands[cmd];
            if (customCommand) {
                try {
                    if (this.bot.options.namedArgs === NamedArgsOption.Always) {
                        const { named, unnamed } = this.bot.extractNamedArgs(params.args);
                        params.extraArgs = [...named.entries()].reduce((obj, [name, value]) => {
                            obj[name] = value;
                            return obj;
                        }, {});
                        params.args = unnamed;
                    }
                    await this.bot.customCommandService.run(customCommand.message, {
                        params,
                        content,
                        args: params.args,
                        permission: CommandPermission[customCommand.permission],
                    });
                } catch (error) {
                    await this.bot.sendError(params.src, error);
                }
            }
        }
    }

    public async run(msg: Message) {
        // User is a bot or in a direct message
        if (msg.author.bot || msg.guild === null) {
            return;
        }

        // User is on timeout
        if (this.bot.timeoutService.onTimeout(msg.author)) {
            return;
        }

        // User is blocklisted in this guild
        const blocklist = await this.bot.dataService.getBlocklist(msg.guild.id);
        if (blocklist.has(msg.author.id)) {
            return;
        }

        const guild = this.bot.dataService.hasGuildInCache(msg.guild.id)
            ? this.bot.dataService.getCachedGuild(msg.guild.id)
            : await this.bot.dataService.getGuild(msg.guild.id);
        const prefix = guild.prefix;

        if (!msg.content.startsWith(prefix)) {
            // Bot is mentioned
            if (msg.mentions.users.has(this.bot.client.user.id)) {
                // Bot mention is the message's prefix
                const mentionIndex = msg.content.indexOf(this.bot.client.user.id);
                const endOfMentionString = mentionIndex + this.bot.client.user.id.length;
                if (
                    (mentionIndex === 2 || (mentionIndex === 3 && msg.content[2] === '!')) &&
                    msg.content[0] === '<' &&
                    msg.content[1] === '@' &&
                    msg.content[endOfMentionString] === '>'
                ) {
                    let content = msg.content.substring(endOfMentionString + 1).trim();
                    await this.runCommand(content, msg, guild);
                }
            }
        } else {
            let content = msg.content.substring(prefix.length);
            await this.runCommand(content, msg, guild);
        }
    }
}
