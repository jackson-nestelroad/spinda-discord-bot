import { CommandCategory, CommandPermission, CommandParameters, StandardCooldowns, SimpleCommand } from '../base';
import { MessageAttachment } from 'discord.js';
import { SpindaCommandNames } from './command-names';
import { SpindaColorChange } from '../../../data/model/caught-spinda';
import { SpindaGeneratorService } from './generator';

export class HordeCommand extends SimpleCommand {
    public name = SpindaCommandNames.Horde;
    public description = `Generates ${SpindaGeneratorService.historySize} Spinda in one image.`;
    public moreDescription = `Use the \`${SpindaCommandNames.Catch}\` command with a number 1 through ${SpindaGeneratorService.historySize} to catch one of the Spinda you like! 1 gives the left-most and ${SpindaGeneratorService.historySize} gives the right-most.`;
    public category = CommandCategory.Spinda;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Medium;

    public async run({ bot, src }: CommandParameters) {
        await src.defer();
        
        // Generate a new Spinda
        const result = await bot.spindaGeneratorService.horde()
        
        // Save it as the last Spinda generated in the channel
        bot.spindaGeneratorService.setChannelHistory(src.channel.id, result.info);

        // Send the image
        const sent = await src.send({ files: [new MessageAttachment(result.buffer)] });

        // Interaction reply must be a message, because we didn't choose ephemeral
        if (!sent.isMessage()) {
            throw new Error('Command reply did not produce a message.');
        }

        for (let i = 0; i < result.info.length; ++i) {
            if (result.info[i].colorChange === SpindaColorChange.Shiny) {
                const sentMsg = sent.message;
                await sentMsg.react('\u{2728}');
                await sentMsg.react(`${String.fromCharCode(0x31 + i)}\u{20E3}`);
            }
        }
    }
}