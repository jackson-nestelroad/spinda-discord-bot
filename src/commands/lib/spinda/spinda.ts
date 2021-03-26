import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';
import { MessageAttachment } from 'discord.js';
import { SpindaCommandNames } from './command-names';
import { SpindaColorChange } from '../../../data/model/caught-spinda';

export class SpindaCommand extends Command {
    public name = SpindaCommandNames.Generate;
    public args = '';
    public description = `Generates a random Spinda pattern from ${0xFFFFFFFF.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} possibilities. There are even random chances for Spinda with special features and colorings. The rarest Spinda is a shiny Spinda! Use the \`${SpindaCommandNames.Catch}\` command to catch a Spinda you like!`;
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;

    public async run({ bot, msg }: CommandParameters) {
        // Generate a new Spinda
        const result = await bot.spindaGeneratorService.generate();
        
        // Save it as the last Spinda generated in the channel
        bot.spindaGeneratorService.pushToChannelHistory(msg.channel.id, result.info);

        // Send the image
        const sent = await msg.channel.send(new MessageAttachment(result.buffer));

        if (result.info.colorChange === SpindaColorChange.Shiny) {
            await sent.react('\u{2728}');
        }
    }
}