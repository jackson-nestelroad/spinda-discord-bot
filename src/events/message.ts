import { Message } from 'discord.js';
import { BaseEvent } from './base';
import { Validation } from './util/validate';
import { DiscordBot } from '../bot';
import { GuildAttributes } from '../data/model/guild';

const event = 'message';

export class MessageEvent extends BaseEvent<typeof event> {
    constructor(bot: DiscordBot) {
        super(bot, event);
    }

    private async runCommand(cmd: string, msg: Message, args: string[], guild: GuildAttributes) {
        if (this.bot.commands.has(cmd)) {
            try {
                const command = this.bot.commands.get(cmd)
                if (Validation.validate(this.bot, command, msg.member)) {
                    await command.run(this.bot, msg, args, guild);
                }
            } catch (error) {
                await msg.channel.send(`\`\`\`${error.name}: ${error.message}\`\`\``);
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
                    const args = msg.content.substr(this.bot.client.user.toString().length + (mentionIndex - 2)).trim().split(' ');
                    const cmd = args.shift();

                    await this.runCommand(cmd, msg, args, guild);
                }
            }
        }
        else {
            const args = msg.content.substr(prefix.length).split(' ');
            const cmd = args.shift();
            
            await this.runCommand(cmd, msg, args, guild);
        }
    }
}