import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';
import { CommandParameters, SimpleCommand, StandardCooldowns } from 'panda-discord';

import { MessageAttachment } from 'discord.js';
import { SpindaColorChange } from './util/spinda';
import { SpindaCommandNames } from './command-names';
import { SpindaGeneratorService } from './generator';

export class HordeCommand extends SimpleCommand<SpindaDiscordBot> {
    public name = SpindaCommandNames.Horde;
    public description = `Generates ${SpindaGeneratorService.historySize} Spinda in one image.`;
    public moreDescription = `Use the \`${SpindaCommandNames.Catch}\` command with a number 1 through ${SpindaGeneratorService.historySize} to catch one of the Spinda you like! 1 gives the left-most and ${SpindaGeneratorService.historySize} gives the right-most.`;
    public category = CommandCategory.Spinda;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Medium;

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>) {
        await src.deferReply();

        // Generate a new Spinda
        const result = await bot.spindaGeneratorService.horde();

        // Save it as the last Spinda generated in the channel
        bot.spindaGeneratorService.setChannelHistory(src.channel.id, result.horde);

        // Send the image
        const sent = await src.send({ files: [new MessageAttachment(result.buffer)] });

        // Interaction reply must be a message, because we didn't choose ephemeral
        if (!sent.isMessage()) {
            throw new Error('Command reply did not produce a message.');
        }

        for (let i = 0; i < result.horde.length; ++i) {
            if (result.horde[i].getColor() === SpindaColorChange.Shiny) {
                const sentMsg = sent.message;
                await sentMsg.react('\u{2728}');
                await sentMsg.react(`${String.fromCharCode(0x31 + i)}\u{20E3}`);
            }
        }
    }
}
