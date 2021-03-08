import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';
import { FunUtil } from './util';
import { TimedCacheSet } from '../../../util/timed-cache';

export class RoutletteCommand extends Command {
    public readonly prefix = ':gun: - ';

    public name = 'roulette';
    public args = '(bullets) (chambers)';
    public description = this.prefix + 'Spins the chambers for a good ol\' fashioned game of Russian Roulette.';
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.high;

    public readonly defaultBullets = 1;
    public readonly defaultChambers = 6;

    public readonly dead: TimedCacheSet<string> = new TimedCacheSet({ minutes: 1 });

    public async run({ msg, args }: CommandParameters) {
        if (this.dead.has(msg.author.id)) {
            await msg.reply('you are already dead!');
            return;
        }

        let bullets = parseInt(args[0]);
        if (isNaN(bullets) || bullets < 1) {
            bullets = this.defaultBullets;
        }

        let chambers = parseInt(args[1]);
        if (isNaN(chambers) || chambers < 1) {
            chambers = this.defaultChambers;
        }

        if (bullets > chambers) {
            bullets = chambers;
        }

        const nickname = msg.guild.member(msg.author).nickname || msg.author.username;

        const responseText = `${nickname} places ${bullets} bullet${bullets === 1 ? '' : 's'} in ${chambers} chamber${chambers === 1 ? '' : 's'}. They spin the cylinder and place the nozzle to their head.`;
        let response = await msg.channel.send(responseText);

        response = await FunUtil.addSuspense(response, responseText + '\n', 2);

        let result: string;
        if (Math.random() < bullets / chambers) {
            result = ` :boom: ***BLAM!***  ${nickname} died. Luck was not on their side...`;
            this.dead.add(msg.author.id);
        }
        else {
            result = ` *click* ...  ${nickname} survived. They breathe a sigh of relief.`;
        }

        await response.edit(response.content + result);
    }
}