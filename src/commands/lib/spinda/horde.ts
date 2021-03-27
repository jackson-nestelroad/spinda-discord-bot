import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';
import { MessageAttachment } from 'discord.js';
import { SpindaCommandNames } from './command-names';
import { SpindaColorChange } from '../../../data/model/caught-spinda';
import { SpindaGeneratorService } from './generator';

export class HordeCommand extends Command {
    public name = SpindaCommandNames.Horde;
    public args = '';
    public description = [
        `Generates ${SpindaGeneratorService.historySize} Spinda in one image, as if running the \`${SpindaCommandNames.Generate}\` command multiple times.`,
        `Use the \`${SpindaCommandNames.Catch}\` command with a number 1 through ${SpindaGeneratorService.historySize} to catch one of the Spinda you like! 1 gives the left-most and ${SpindaGeneratorService.historySize} gives the right-most.`
    ];
    public category = CommandCategory.Spinda;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Medium;

    public async run({ bot, msg }: CommandParameters) {
        // Generate a new Spinda
        const result = await bot.spindaGeneratorService.horde()
        
        // Save it as the last Spinda generated in the channel
        bot.spindaGeneratorService.setChannelHistory(msg.channel.id, result.info);

        // Send the image
        const sent = await msg.channel.send(new MessageAttachment(result.buffer));

        for (let i = 0; i < result.info.length; ++i) {
            if (result.info[i].colorChange === SpindaColorChange.Shiny) {
                await sent.react('\u{2728}');
                await sent.react(`${String.fromCharCode(0x31 + i)}\u{20E3}`);
            }
        }
    }
}