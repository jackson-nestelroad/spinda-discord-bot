import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';
import { SpindaCommandNames } from './command-names';
import { SpindaGeneratorService } from './generator';
import { EmbedTemplates } from '../../../util/embed';

export class ReleaseCommand extends Command {
    public name = SpindaCommandNames.Release;
    public args = 'position';
    public description = 'Releases a single Spinda from your party.';
    public category = CommandCategory.Spinda;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.High;

    public async run({ bot, msg, content }: CommandParameters) {
        const pos = parseInt(content);
        if (isNaN(pos) || pos <= 0) {
            throw new Error(`Position must be a positive integer.`);
        }
        else if (pos > SpindaGeneratorService.partySize) {
            throw new Error(`Position too large.`);
        }

        const caughtSpinda = await bot.dataService.getCaughtSpinda(msg.author.id);

        if (pos > caughtSpinda.length) {
            throw new Error(`Invalid position. You only have ${caughtSpinda.length} Spinda caught.`);
        }
        
        await bot.dataService.releaseCaughtSpinda(msg.author.id, pos - 1);

        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(`Goodbye, Spinda! Successfully released position ${pos}.`);
        await msg.channel.send(embed);
    }
}