import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';
import { SpindaCommandNames } from './command-names';
import { SpindaGeneratorService } from './generator';
import { EmbedTemplates } from '../../../util/embed';

export class SwapCommand extends Command {
    public name = SpindaCommandNames.Swap;
    public args = 'first second';
    public description = 'Switches the positions of two Spinda in your party.';
    public category = CommandCategory.Spinda;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.High;

    public async run({ bot, msg, args }: CommandParameters) {
        if (args.length < 2) {
            throw new Error(`Must include two party positions.`);
        }

        const first = parseInt(args[0]);
        const second = parseInt(args[1]);

        if (isNaN(first) || first < 1 || isNaN(second) || second < 1) {
            throw new Error(`Position must be a positive integer.`);
        }
        else if (first > SpindaGeneratorService.partySize || second > SpindaGeneratorService.partySize) {
            throw new Error(`Position too large.`);
        }
        
        const caughtSpinda = await bot.dataService.getCaughtSpinda(msg.author.id);

        if (first > caughtSpinda.length || second > caughtSpinda.length) {
            throw new Error(`Invalid position. You only have ${caughtSpinda.length} Spinda caught.`);
        }
        
        if (first === second) {
            throw new Error(`Cannot swap a slot with itself.`);
        }

        await bot.dataService.swapCaughtSpindaPositions(msg.author.id, first - 1, second - 1);

        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(`Successfully swapped positions ${first} and ${second}.`);
        await msg.channel.send(embed);
    }
}