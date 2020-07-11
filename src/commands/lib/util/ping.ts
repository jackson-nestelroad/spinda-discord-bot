import { Command, CommandCategory, CommandPermission } from '../base';
import { DiscordBot } from '../../../bot';
import { Message } from 'discord.js';

export class PingCommand implements Command {
    public names = ['ping'];
    public args = '';
    public description = 'Checks if the bot is still alive.';
    public category = CommandCategory.Utility;
    public permission = CommandPermission.Everyone;

    public async run(bot: DiscordBot, msg: Message) {
        const start = new Date();
        msg.channel.send('Pong!').then(msg => {
            const end = new Date();
            msg.edit(`Pong! (${((end as any) - (start as any))} ms)`);
        });
    }
}