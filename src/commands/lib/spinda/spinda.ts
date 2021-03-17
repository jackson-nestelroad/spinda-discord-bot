import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';
import { MessageAttachment } from 'discord.js';
import { SpindaCommandNames } from './command-names';

export class SpindaCommand extends Command {
    public name = SpindaCommandNames.Generate;
    public args = '';
    public description = `Generates a random Spinda pattern from ${0xFFFFFFFF.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} possibilities. There is even a chance for shinies!`;
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;

    public async run({ bot, msg }: CommandParameters) {
        // Generate a new Spinda
        const result = await bot.spindaGeneratorService.generate();
        
        // Save it as the last Spinda generated in the channel
        bot.spindaGeneratorService.setLastGeneratedForChannel(msg.channel.id, result.info);

        // Send the image
        await msg.channel.send(new MessageAttachment(result.buffer));
    }
}