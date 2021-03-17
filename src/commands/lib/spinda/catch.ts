import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';
import { SpindaCommandNames } from './command-names';

export class CatchCommand extends Command {
    public name = SpindaCommandNames.Catch;
    public args = '';
    public description = `Catches the last Spinda generated in the current channel. Caught Spinda can be regenerated at any time using the \`${SpindaCommandNames.View}\` command. You may only have one Spinda saved at any given time.`;
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.High;

    public async run({ bot, msg, guild }: CommandParameters) {
        const lastSpinda = bot.spindaGeneratorService.getLastGeneratedForChannel(msg.channel.id);
        if (!lastSpinda) {
            throw new Error(`No new Spinda found in this channel. Use \`${guild.prefix}${SpindaCommandNames.Generate}\` to generate a Spinda to catch.`);
        }

        await bot.dataService.catchSpinda(msg.author.id, lastSpinda);
        bot.spindaGeneratorService.deleteLastGeneratedForChannel(msg.channel.id);
        
        const embed = bot.createEmbed({ success: true });
        embed.setDescription(`Successfully caught! You can regenerate your Spinda at any time using \`${guild.prefix}${SpindaCommandNames.View}\`. Note that any future catches will overwrite this Spinda.`);
        await msg.channel.send(embed);
    }
}