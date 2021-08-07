import moment from 'moment';
import { CommandParameters, SimpleCommand, StandardCooldowns } from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';

export class UptimeCommand extends SimpleCommand<SpindaDiscordBot> {
    public name = 'uptime';
    public description = 'Gives how long the bot has been continually running.';
    public category = CommandCategory.Utility;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Low;

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>) {
        const now = new Date();
        const diff = now.valueOf() - bot.startedAt.valueOf();
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

        await src.send(reply.join(', '));
    }
}
