import { Command, CommandCategory, CommandPermission } from '../base';
import { DiscordBot } from '../../../bot';
import { Message } from 'discord.js';

export class PingCommand implements Command {
    public name = 'ping';
    public args = '';
    public description = 'Checks if the bot is still alive.';
    public category = CommandCategory.Utility;
    public permission = CommandPermission.Everyone;

    public async run(bot: DiscordBot, msg: Message) {
        const start = new Date();
        const newMsg = await msg.channel.send('Pong!');
        const end = new Date();
        newMsg.edit(`Pong! (${((end as any) - (start as any))} ms)`);
    }
}