import { CommandParameters, SimpleCommand, StandardCooldowns } from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';

export class MemoryCommand extends SimpleCommand<SpindaDiscordBot> {
    public name = 'memory';
    public description = 'Gives the amount of memory currently used by the bot.';
    public category = CommandCategory.Utility;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Low;

    private readonly precision = 2;

    public async run({ src }: CommandParameters<SpindaDiscordBot>) {
        const bytes = process.memoryUsage().rss;
        let message: string;
        if (bytes >= 1 << 30) {
            message = `${(bytes / (1 << 30)).toFixed(this.precision)} GB`;
        } else if (bytes >= 1 << 20) {
            message = `${(bytes / (1 << 20)).toFixed(this.precision)} MB`;
        } else if (bytes >= 1 << 10) {
            message = `${(bytes / (1 << 10)).toFixed(this.precision)} KB`;
        } else {
            message = `${bytes} bytes`;
        }
        await src.send('`' + message + '`');
    }
}
