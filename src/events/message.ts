import { Message } from 'discord.js';
import { BaseEvent } from './base';
import { Validation } from './util/validate';

export class MessageEvent extends BaseEvent<'message'> {
    public async run(msg: Message) {
        if (msg.author.bot) {
            return;
        }
    
        const prefix = this.bot.dataService.getGuildConfig(msg.guild.id).prefix;
        
        if (!msg.content.startsWith(prefix)) {
            // Bot is mentioned
            if (msg.mentions.users.has(this.bot.client.user.id)) {
                // User is asking for help
                if (msg.content.toLowerCase().includes('help')) {
                    this.bot.commands.get('help').run(this.bot, msg, []);
                }
            }
        }
        else { 
            const args = msg.content.split(' ');
            const cmd = args.shift().substr(prefix.length);
            
            if (this.bot.commands.has(cmd)) {
                try {
                    const command = this.bot.commands.get(cmd)
                    if (Validation.validate(this.bot, command, msg.member)) {
                        await command.run(this.bot, msg, args);
                    }
                } catch (error) {
                    msg.channel.send(`\`\`\`${error}\`\`\``);
                }
            }
        }
    }
}