import { Command, CommandCategory, CommandPermission } from '../base';
import { DiscordBot } from '../../../bot';
import { Message } from 'discord.js';
import * as moment from 'moment';

export class UptimeCommand implements Command {
    public names = ['uptime'];
    public args = '';
    public description = 'Gives how long the bot has been continually running.';
    public category = CommandCategory.Utility;
    public permission = CommandPermission.Everyone;

    public async run(bot: DiscordBot, msg: Message, args: string[]) {
        const now = new Date();
        const diff = (now as any) - (bot.startedAt as any);
        const duration = moment.duration(diff);

        let reply: string[] = [];
        const years = duration.years();
        const months = duration.subtract(years, 'years').months();
        const days = duration.subtract(months, 'months').days();
        const hours = duration.subtract(days, 'days').hours();
        const mins = duration.subtract(hours, 'hours').minutes();
        const secs = duration.subtract(mins, 'minutes').seconds();

        if (years > 0) {
            reply.push(`${years} year${years === 1 ? '' : 's'}`);
        }
        if (months > 0) {
            reply.push(`${months} month${months === 1 ? '' : 's'}`);
        }
        if (days > 0) {
            reply.push(`${days} day${days === 1 ? '' : 's'}`);
        }
        if (hours > 0) {
            reply.push(`${hours} hour${hours === 1 ? '' : 's'}`);
        }
        if (mins > 0) {
            reply.push(`${mins} minute${mins === 1 ? '' : 's'}`);
        }
        if (secs > 0) {
            reply.push(`${secs} second${secs === 1 ? '' : 's'}`);
        }

        await msg.channel.send(reply.join(', '));
    }
}