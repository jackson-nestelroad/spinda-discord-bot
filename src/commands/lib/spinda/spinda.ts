import { MessageAttachment } from 'discord.js';
import { CommandParameters, SimpleCommand } from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';
import { SpindaColorChange } from '../../../data/model/caught-spinda';
import { SpindaCommandNames } from './command-names';

export class SpindaCommand extends SimpleCommand<SpindaDiscordBot> {
    public name = SpindaCommandNames.Generate;
    public description = 'Generates a random Spinda pattern.';
    public moreDescription = [
        `There are ${(0xffffffff)
            .toString()
            .replace(
                /\B(?=(\d{3})+(?!\d))/g,
                ',',
            )} possibilities. There are even random chances for Spinda with special features and colorings. The rarest Spinda is a shiny Spinda!`,
        `Use the \`${SpindaCommandNames.Catch}\` command to catch a Spinda you like!`,
    ];
    public category = CommandCategory.Spinda;
    public permission = CommandPermission.Everyone;

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>) {
        await src.deferReply();

        // Generate a new Spinda
        const result = await bot.spindaGeneratorService.generate();

        // Save it as the last Spinda generated in the channel
        bot.spindaGeneratorService.pushToChannelHistory(src.channel.id, result.info);

        // Send the image
        const sent = await src.send({ files: [new MessageAttachment(result.buffer)] });

        if (!sent.isMessage()) {
            throw new Error('Command reply did not produce a message.');
        }

        if (result.info.colorChange === SpindaColorChange.Shiny) {
            await sent.message.react('\u{2728}');
        }
    }
}
