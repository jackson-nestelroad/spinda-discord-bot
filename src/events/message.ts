import { Message } from 'discord.js';
import { BaseEvent } from './base';
import { Validation } from './util/validate';
import { DiscordBot } from '../bot';
import { GuildAttributes } from '../data/model/guild';
import { CommandParameters } from '../commands/lib/base';
import { CustomCommandParser } from './util/custom-command-parser';

const event = 'message';

export class MessageEvent extends BaseEvent<typeof event> {
    constructor(bot: DiscordBot) {
        super(bot, event);
    }

    private async runCommand(cmd: string, params: CommandParameters) {
        // Global command
        if (this.bot.commands.has(cmd)) {
            try {
                const command = this.bot.commands.get(cmd)
                if (Validation.validate(this.bot, command, params.msg.member)) {
                    await command.run(params);
                }
            } catch (error) {
                const embed = this.bot.createEmbed({ footer: false, timestamp: false, error: true });
                embed.setDescription(error.message || error.toString());
                await params.msg.channel.send(embed);
            }
        }
        // Could be a custom (guild) command
        else {
            const customCommands = await this.bot.dataService.getCustomCommands(params.msg.guild.id);
            if (customCommands[cmd]) {
                await params.msg.channel.send(CustomCommandParser.parse(params.msg, params.args, customCommands[cmd]));
            }
        }
    }
    
    public async run(msg: Message) {
        if (msg.author.bot || msg.guild === null) {
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
                    const args = content.split(' ');
                    const cmd = args.shift();
                    content = content.substr(cmd.length).trimLeft();

                    await this.runCommand(cmd, { bot: this.bot, msg, args, content, guild });
                }
            }
        }
        else {
            let content = msg.content.substr(prefix.length);
            const args = content.split(' ');
            const cmd = args.shift();
            content = content.substr(cmd.length).trimLeft();
            
            await this.runCommand(cmd, { bot: this.bot, msg, args, content, guild });
        }
    }
}