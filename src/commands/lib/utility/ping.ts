import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';

export class PingCommand extends Command {
    public name = 'ping';
    public args = '';
    public description = 'Checks if the bot is still alive.';
    public category = CommandCategory.Utility;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.low;

    public async run({ msg }: CommandParameters) {
        const start = new Date();
        const newMsg = await msg.channel.send('Pong!');
        const end = new Date();
        await newMsg.edit(`Pong! (${((end as any) - (start as any))} ms)`);
    }
}