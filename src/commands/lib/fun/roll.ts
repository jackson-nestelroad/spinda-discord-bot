import {
    ArgumentsConfig,
    ArgumentType,
    CommandParameters,
    ComplexCommand,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';

interface RollArgs {
    roll: string;
}

export class RollCommand extends ComplexCommand<SpindaDiscordBot, RollArgs> {
    public prefix = ':game_die: - ';
    public name = 'roll';
    public description = 'Rolls a die according to the dice format given.';
    public moreDescription =
        'You an specify the number of sides, number of rolls, and any extra mathematical operations on nested dice rolls. Mathematical operations can use the results of other dice rolls as well.';
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Medium;

    public args: ArgumentsConfig<RollArgs> = {
        roll: {
            description: 'Dice notation: XdY([+-x/]A(dB)).',
            type: ArgumentType.RestOfContent,
            required: true,
        },
    };

    private readonly rollCountLimit = 256;
    private readonly arrow = '\u21d2';
    private readonly diceRegex = /(\d+)d(\d+)/;
    private readonly operationRegex = /(?:([+\-x/])(?:(\d+)(?:d(\d+))?))/;
    private readonly operations = {
        '+': 'Bonus',
        '-': 'Penalty',
        x: 'Multiplier',
        '/': 'Divisor',
    } as const;

    private roll(rolls: number, faces: number): [number, string] {
        const results: number[] = [];
        let result = 0;

        for (let i = 0; i < rolls; ++i) {
            const roll = Math.floor(Math.random() * faces) + 1;
            results.push(roll);
            result += roll;
        }

        return [result, `[ ${results.join(', ')} ] ${this.arrow} ${result}`];
    }

    private assureRollCount(rollCount: number, delta: number): number {
        rollCount += delta;
        if (rollCount > this.rollCountLimit) {
            throw new Error(`Roll count limit (${this.rollCountLimit}) exceeded.`);
        }
        return rollCount;
    }

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>, args: RollArgs) {
        let roll = args.roll;
        let rollCount = 0;

        let match: RegExpMatchArray = roll.match(this.diceRegex);
        if (!match || match.index !== 0) {
            throw new Error(`Invalid dice roll.`);
        }

        const rolls = parseInt(match[1]);
        const faces = parseInt(match[2]);

        rollCount = this.assureRollCount(rollCount, rolls);

        const embed = bot.createEmbed();
        let [result, diceRollString] = this.roll(rolls, faces);
        embed.addField('Initial Roll', diceRollString);

        while (true) {
            roll = roll.substr(match.index + match[0].length);
            match = roll.match(this.operationRegex);
            if (!match) {
                break;
            }

            const operator = match[1];
            const firstNum = parseInt(match[2]);

            let nestedResultString = match[2];
            let nestedResult = firstNum;

            // Dice roll
            if (match[3]) {
                const secondNum = parseInt(match[3]);
                rollCount = this.assureRollCount(rollCount, firstNum);
                [nestedResult, nestedResultString] = this.roll(firstNum, secondNum);
                nestedResultString = `{ ${nestedResultString} }`;
            }

            if (!this.operations[operator]) {
                throw new Error(`Invalid operation (${operator}).`);
            }

            let oldResult = result;

            switch (operator) {
                case '+':
                    result += nestedResult;
                    break;
                case '-':
                    result -= nestedResult;
                    break;
                case 'x':
                    result *= nestedResult;
                    break;
                case '/':
                    result = Math.round(result / nestedResult);
                    break;
            }

            embed.addField(
                this.operations[operator],
                `${oldResult} ${operator} ${nestedResultString} ${this.arrow} ${result}`,
            );
        }

        embed.setTitle(`:game_die: ${this.arrow} ${result}`);
        await src.send({ embeds: [embed] });
    }
}
