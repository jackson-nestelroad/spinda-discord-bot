import { MessageAttachment } from 'discord.js';
import { SpindaColorChange } from '../../../data/model/caught-spinda';
import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';
import { SpindaCommandNames } from './command-names';

export class MySpindaCommand extends Command {
    public name = SpindaCommandNames.View;
    public args = '';
    public description = `Regenerates the Spinda you have previously caught.`;
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.High;

    private readonly classifications: Partial<Record<SpindaColorChange, string>> = {
        [SpindaColorChange.Shiny]: 'Shiny \u{2728}',
        [SpindaColorChange.Retro]: 'Retro \u{1F579}',
        [SpindaColorChange.Gold]: 'Gold \u{1F947}',
        [SpindaColorChange.Green]: 'Forest \u{1F332}',
        [SpindaColorChange.Blue]: 'Ocean \u{1F30A}',
        [SpindaColorChange.Purple]: 'Ghost \u{1F47B}',
        [SpindaColorChange.Pink]: 'Valentine \u{1F495}',
        [SpindaColorChange.Gray]: 'Panda \u{1F43C}',
        [SpindaColorChange.Custom]: 'Random \u{1F3B2}'
    };

    public async run({ bot, msg, guild }: CommandParameters) {
        const caughtSpinda = await bot.dataService.getCaughtSpinda(msg.author.id);
        if (!caughtSpinda) {
            throw new Error(`You have not yet caught a Spinda! Use \`${guild.prefix}${SpindaCommandNames.Catch} N\` to catch the one of the last generated Spinda in the channel.`);
        }

        const result = await bot.spindaGeneratorService.generate(caughtSpinda);

        const embed = bot.createEmbed();
        const attachment = new MessageAttachment(result.buffer, 'thumbnail.png');
        embed.attachFiles(attachment as any).setThumbnail('attachment://thumbnail.png');

        embed.setTitle(`${msg.author.username}'s Spinda`);
        embed.addField('PID', result.info.pid, true);

        if (result.info.colorChange !== SpindaColorChange.None) {
            embed.addField('Classification', this.classifications[result.info.colorChange], true);
        }
          
        embed.addField('Generated At', result.info.generatedAt.toLocaleString(), true);

        await msg.channel.send(embed);
    }
}