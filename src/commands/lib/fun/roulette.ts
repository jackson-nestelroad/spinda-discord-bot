import { CommandCategory, CommandPermission, CommandParameters, StandardCooldowns, ComplexCommand, ArgumentsConfig, ArgumentType } from '../base';
import { FunUtil } from './util';
import { TimedCacheSet } from '../../../util/timed-cache';

interface RouletteArgs {
    bullets: number;
    chambers: number;
}

export class RoutletteCommand extends ComplexCommand<RouletteArgs> {
    public prefix = ':gun: - ';
    public name = 'roulette';
    public description = 'Spins the chambers for a good ol\' fashioned game of Russian Roulette.';
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.High;

    public args: ArgumentsConfig<RouletteArgs> = {
        bullets: {
            description: 'Number of bullets to load.',
            type: ArgumentType.Integer,
            required: false,
            default: 1,
        },
        chambers: {
            description: 'Number of chambers in the gun.',
            type: ArgumentType.Integer,
            required: false,
            default: 6,
        },
    };

    public readonly dead: TimedCacheSet<string> = new TimedCacheSet({ minutes: 1 });

    public async run({ bot, src }: CommandParameters, args: RouletteArgs) {
        if (this.dead.has(src.author.id)) {
            await src.reply('You are already dead!');
            return;
        }

        if (args.bullets > args.chambers) {
            args.bullets = args.chambers;
        }

        const nickname = src.guild.members.cache.get(src.author.id).nickname || src.author.username;

        const responseText = `${nickname} places ${args.bullets} bullet${args.bullets === 1 ? '' : 's'} in ${args.chambers} chamber${args.chambers === 1 ? '' : 's'}. They spin the cylinder and place the nozzle to their head.`;
        let response = await src.send(responseText);

        response = await FunUtil.addSuspense(bot, response, responseText + '\n', 2);

        let result: string;
        if (Math.random() < args.bullets / args.chambers) {
            result = ` :boom: ***BLAM!***  ${nickname} died. Luck was not on their side...`;
            this.dead.add(src.author.id);
        }
        else {
            result = ` *click* ...  ${nickname} survived. They breathe a sigh of relief.`;
        }

        await response.append(result);
    }
}