import { Message } from 'discord.js';
import { BaseEvent } from './base';
import { Validation } from './util/validate';
import { DiscordBot } from '../bot';
import { ChatCommandParameters } from '../commands/lib/base';
import { GuildAttributes } from '../data/model/guild';
import { CommandSource } from '../util/command-source';

const event = 'messageCreate';

export class MessageCreateEvent extends BaseEvent<typeof event> {
    private forbiddenMentionRegex = /@(everyone|here)/g;

    constructor(bot: DiscordBot) {
        super(bot, event);
    }

    private async runCommand(content: string, msg: Message, guild: GuildAttributes) {
        const args = this.bot.splitIntoArgs(content);
        const cmd = args.shift();
        content = content.substr(cmd.length).trim();
        content = content.replace(this.forbiddenMentionRegex, '@\u{200b}$1');

        const params: ChatCommandParameters = {
            bot: this.bot,
            src: new CommandSource(msg),
            args,
            content,
            guild,
        };

        // Global command
        if (this.bot.commands.has(cmd)) {
            try {
                const command = this.bot.commands.get(cmd)
                if (Validation.validate(params, command, params.src.member)) {
                    await command.executeChat(params);
                }
            } catch (error) {
                await this.bot.sendError(params.src, error);
            }
        }
        // Could be a custom (guild) command
        else {
            const customCommands = await this.bot.dataService.getCustomCommands(params.src.guild.id);
            if (customCommands[cmd]) {
                try {
                    await this.bot.customCommandService.run(customCommands[cmd].message, {
                        params,
                        content,
                        args,
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
    
        const guild = await this.bot.dataService.getGuild(msg.guild.id);
        const prefix = guild.prefix;
        
        if (!msg.content.startsWith(prefix)) {
            // Bot is mentioned
            if (msg.mentions.users.has(this.bot.client.user.id)) {
                // Bot mention is the message's prefix
                const mentionIndex = msg.content.indexOf(this.bot.client.user.id);
                const endOfMentionString = mentionIndex + this.bot.client.user.id.length;
                if ((mentionIndex === 2 || (mentionIndex === 3 && msg.content[2] === '!'))
                    && msg.content[0] === '<' && msg.content[1] === '@' && msg.content[endOfMentionString] === '>') {
                    let content = msg.content.substr(endOfMentionString + 1).trim();
                    await this.runCommand(content, msg, guild);
                }
            }
        }
        else {
            let content = msg.content.substr(prefix.length);
            await this.runCommand(content, msg, guild);
        }
    }
}