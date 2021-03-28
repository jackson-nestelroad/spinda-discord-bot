import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';

export class MemoryCommand extends Command {
    public name = 'memory';
    public args = '';
    public description = 'Gives the amount of memory currently used by the bot.';
    public category = CommandCategory.Utility;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Low;

    private readonly precision = 2;

    public async run({ msg }: CommandParameters) {
        const bytes = process.memoryUsage().rss;
        let message: string;
        if (bytes >= 1 << 30) {
            message = `${(bytes / (1 << 30)).toFixed(this.precision)} GB`;
        }
        else if (bytes >= 1 << 20) {
            message = `${(bytes / (1 << 20)).toFixed(this.precision)} MB`;
        }
        else if (bytes >= 1 << 10) {
            message = `${(bytes / (1 << 10)).toFixed(this.precision)} KB`;
        }
        else {
            message = `${bytes} bytes`;
        }
        await msg.channel.send('`' + message + '`');
    }
}