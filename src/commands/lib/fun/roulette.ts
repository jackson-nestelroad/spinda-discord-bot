import { Command, CommandCategory, CommandPermission, CommandParameters } from '../base';
import { FunUtil } from './util';

export class RoutletteCommand implements Command {
    public readonly prefix = ':gun: - ';

    public name = 'roulette';
    public args = '(bullets) (chambers)';
    public description = this.prefix + 'Spins the chambers for a good ol\' fashioned game of Russian Roulette.';
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;

    public readonly defaultBullets = 1;
    public readonly defaultChambers = 6;

    public readonly dead: Map<string, Date> = new Map();

    public readonly timeToRevive: number = 1 * 60 * 1000;

    public async run({ msg, args }: CommandParameters) {
        if (this.dead.has(msg.author.id)) {
            const diedAt = this.dead.get(msg.author.id);
            if ((new Date() as any) - (diedAt as any) > this.timeToRevive) {
                this.dead.delete(msg.author.id);
            }
            else {
                await msg.reply('You are already dead!');
                return;
            }
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
            this.dead.set(msg.author.id, new Date());
        }
        else {
            result = ` *click* ...  ${nickname} survived. They breathe a sigh of relief.`;
        }

        await response.edit(response.content + result);
    }
}