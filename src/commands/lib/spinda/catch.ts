import { EmbedTemplates } from '../../../util/embed';
import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';
import { SpindaCommandNames } from './command-names';
import { SpindaGeneratorService } from './generator';

export class CatchCommand extends Command {
    public name = SpindaCommandNames.Catch;
    public args = '(position)';
    public description = [
        `Catches one of the last ${SpindaGeneratorService.historySize} Spinda generated in the channel. Once one Spinda is caught, the others run away.`,
        `Caught Spinda can be regenerated at any time using the \`${SpindaCommandNames.View}\` command. You may only have one Spinda saved at any given time.`,
        `The position specifies the Spinda to catch, with 1 being the top-most (left-most in a horde) and ${SpindaGeneratorService.historySize} being the bottom-most (right-most in a horde). Give no index to catch the newest Spinda.`
    ];
    public category = CommandCategory.Spinda;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.High;

    public async run({ bot, msg, guild, content }: CommandParameters) {
        const wantedPosition = content ? parseInt(content) : 0;
        if (isNaN(wantedPosition) || wantedPosition < 0) {
            throw new Error('Position must be a positive integer.');
        }

        const lastSpinda = bot.spindaGeneratorService.getFromChannelHistory(msg.channel.id, wantedPosition);
        if (!lastSpinda) {
            const generateMessage = `Use \`${guild.prefix}${SpindaCommandNames.Generate}\` to generate a Spinda to catch.`;
            if (wantedPosition === 0) {
                throw new Error('No new Spinda found in this channel. ' + generateMessage);
            }
            else {
                throw new Error(`Spinda at position ${wantedPosition} could not be found. ` + generateMessage);
            }
        }

        await bot.dataService.catchSpinda(msg.author.id, lastSpinda);
        bot.spindaGeneratorService.clearChannelHistory(msg.channel.id);
        
        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(`Successfully caught! The other Spinda ran away. You can regenerate your Spinda at any time using \`${guild.prefix}${SpindaCommandNames.View}\`. Note that any future catches will overwrite this Spinda.`);
        await msg.channel.send(embed);
    }
}