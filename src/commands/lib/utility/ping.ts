import { CommandCategory, CommandPermission, CommandParameters, StandardCooldowns, SimpleCommand } from '../base';

export class PingCommand extends SimpleCommand {
    public name = 'ping';
    public description = 'Checks if the bot is still alive.';
    public category = CommandCategory.Utility;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Low;

    public async run({ src }: CommandParameters) {
        const start = new Date();
        const newMsg = await src.send('Pong!');
        const end = new Date();
        await newMsg.edit(`Pong! (${end.valueOf() - start.valueOf()} ms)`);
    }
}