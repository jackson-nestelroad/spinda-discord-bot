import {
    ArgumentsConfig,
    ArgumentType,
    CommandParameters,
    ComplexCommand,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';

interface ChooseArgs {
    choices: string;
}

export class ChooseCommand extends ComplexCommand<SpindaDiscordBot, ChooseArgs> {
    public readonly separator: string = ';';

    public name = 'choose';
    public description = 'Randomly selects one choice from a given list of options.';
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Low;

    public args: ArgumentsConfig<ChooseArgs> = {
        choices: {
            description: `Any number of choices separated using \`${this.separator}\`. For example: choice${this.separator} choice${this.separator} ...`,
            type: ArgumentType.RestOfContent,
            required: true,
        },
    };

    public readonly header = 'I choose... ';

    public async run({ src }: CommandParameters<SpindaDiscordBot>, args: ChooseArgs) {
        const choices = args.choices.trim().split(this.separator);
        let choice = 'nothing!';
        if (choices.length > 1 || choices[0]) {
            choice = '"' + choices[Math.floor(Math.random() * choices.length)].trim() + '"';
        }

        await src.send(this.header + choice);
    }
}
