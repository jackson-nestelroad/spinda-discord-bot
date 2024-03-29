import { CommandParameters, SimpleCommand, StandardCooldowns } from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';

export class PingCommand extends SimpleCommand<SpindaDiscordBot> {
    public name = 'ping';
    public description = 'Checks if the bot is still alive.';
    public category = CommandCategory.Utility;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Low;

    public enableInDM = true;

    public async run({ src }: CommandParameters<SpindaDiscordBot>) {
        const start = new Date();
        const newMsg = await src.send('Pong!');
        const end = new Date();
        await newMsg.edit(`Pong! (${end.valueOf() - start.valueOf()} ms)`);
    }
}
