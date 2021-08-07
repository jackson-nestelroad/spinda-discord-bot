import {
    ArgumentsConfig,
    ArgumentType,
    CommandParameters,
    ComplexCommand,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';

interface EightBallArgs {
    question?: string;
}

export class EightBallCommand extends ComplexCommand<SpindaDiscordBot, EightBallArgs> {
    public prefix = ':8ball: - ';
    public name = '8ball';
    public description = 'Shakes the Magic 8-ball for a glimpse into the future.';
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Low;

    public args: ArgumentsConfig<EightBallArgs> = {
        question: {
            description: 'Question to ask.',
            type: ArgumentType.RestOfContent,
            required: false,
        },
    };

    public readonly options = [
        'It is certain.',
        'It is decidedly so.',
        'Without a doubt.',
        'Yes, definitely.',
        'You may rely on it.',
        'As I see it, yes.',
        'Most likely.',
        'Outlook good.',
        'Yes.',
        'Signs point to yes.',
        'Reply hazy, try again.',
        'Ask again later.',
        'Better not tell you now.',
        'Cannot predict now.',
        'Concentrate and ask again.',
        "Don't count on it.",
        'My reply is no.',
        'My sources say no.',
        'Outlook not so good.',
        'Very doubtful.',
    ];

    public async run({ src }: CommandParameters<SpindaDiscordBot>, args: EightBallArgs) {
        await src.send(this.prefix + this.options[Math.floor(Math.random() * this.options.length)]);
    }
}
