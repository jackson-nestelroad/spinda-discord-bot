import { Message } from 'discord.js';
import { BaseEvent } from './base';
import { Validation } from './util/validate';
import { DiscordBot } from '../bot';
import { CommandParameters } from '../commands/lib/base';
import { CustomCommandEngine } from './util/custom-command';
import { GuildAttributes } from '../data/model/guild';

const event = 'message';

export class MessageEvent extends BaseEvent<typeof event> {
    private forbiddenMentionRegex = /@(everyone|here)/g;

    constructor(bot: DiscordBot) {
        super(bot, event);
    }

    private async runCommand(content: string, msg: Message, guild: GuildAttributes) {
        const args = content.split(' ');
        const cmd = args.shift();
        content = content.substr(cmd.length).trim();
        content = content.replace(this.forbiddenMentionRegex, '@\u{200b}$1');

        const params: CommandParameters = { bot: this.bot, msg, args, content, guild };
        // Global command
        if (this.bot.commands.has(cmd)) {
            try {
                const command = this.bot.commands.get(cmd)
                if (Validation.validate(params, command, params.msg.member)) {
                    await command.execute(params);
                }
            } catch (error) {
                await params.bot.sendError(params.msg, error);
            }
        }
        // Could be a custom (guild) command
        else {
            const customCommands = await this.bot.dataService.getCustomCommands(params.msg.guild.id);
            if (customCommands[cmd]) {
                try {
                    await new CustomCommandEngine(params).run(customCommands[cmd]);
                } catch (error) {
                    await params.bot.sendError(params.msg, error);
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

        // User is blacklisted in this guild
        const blacklist = await this.bot.dataService.getBlacklist(msg.guild.id);
        if (blacklist.has(msg.author.id)) {
            return;
        }
    
        const guild = await this.bot.dataService.getGuild(msg.guild.id);
        const prefix = guild.prefix;
        
        if (!msg.content.startsWith(prefix)) {
            // Bot is mentioned
            if (msg.mentions.users.has(this.bot.client.user.id)) {
                // Bot mention is the message's prefix
                const mentionIndex = msg.content.indexOf(this.bot.client.user.id);
                if (mentionIndex === 2 || mentionIndex === 3) {
                    let content = msg.content.substr(this.bot.client.user.toString().length + (mentionIndex - 2)).trim();
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