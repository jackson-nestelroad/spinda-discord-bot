import {
    ArgumentsConfig,
    ArgumentType,
    CommandParameters,
    ComplexCommand,
    EmbedTemplates,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';
import { SpindaCommandNames } from './command-names';
import { SpindaGeneratorService } from './generator';

interface SwapArgs {
    first: number;
    second: number;
}

export class SwapCommand extends ComplexCommand<SpindaDiscordBot, SwapArgs> {
    public name = SpindaCommandNames.Swap;
    public description = 'Switches the positions of two Spinda in your party.';
    public category = CommandCategory.Spinda;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.High;

    public args: ArgumentsConfig<SwapArgs> = {
        first: {
            description: 'First position to switch.',
            type: ArgumentType.Integer,
            required: true,
        },
        second: {
            description: 'Second position to switch',
            type: ArgumentType.Integer,
            required: true,
        },
    };

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>, args: SwapArgs) {
        const { first, second } = args;

        if (first < 1 || second < 1) {
            throw new Error(`Position must be a positive integer.`);
        } else if (first > SpindaGeneratorService.partySize || second > SpindaGeneratorService.partySize) {
            throw new Error(`Position too large.`);
        }

        const caughtSpinda = await bot.dataService.getCaughtSpinda(src.author.id);

        if (first > caughtSpinda.length || second > caughtSpinda.length) {
            throw new Error(`Invalid position. You only have ${caughtSpinda.length} Spinda caught.`);
        }

        if (first === second) {
            throw new Error(`Cannot swap a slot with itself.`);
        }

        await bot.dataService.swapCaughtSpindaPositions(src.author.id, first - 1, second - 1);

        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(`Successfully swapped positions ${first} and ${second}.`);
        await src.send({ embeds: [embed] });
    }
}
