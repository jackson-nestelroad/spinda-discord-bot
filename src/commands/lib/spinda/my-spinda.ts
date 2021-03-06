import { MessageAttachment } from 'discord.js';
import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';
import { SpindaCommandNames } from './command-names';
import { SpindaCommand } from './spinda';

export class MySpindaCommand extends Command {
    public name = SpindaCommandNames.View;
    public args = '';
    public description = `Regenerates the Spinda you have previously caught.`;
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.High;

    public async run({ bot, msg, guild }: CommandParameters) {
        const generateCommand = bot.commands.get(SpindaCommandNames.Generate) as SpindaCommand;
        const caughtSpinda = await bot.dataService.getCaughtSpinda(msg.author.id);
        if (!caughtSpinda) {
            throw new Error(`You have not yet caught a Spinda! Use \`${guild.prefix}${SpindaCommandNames.Catch}\` to catch the last generated Spinda in the channel.`);
        }

        const result = await generateCommand.generate(bot, caughtSpinda);

        const embed = bot.createEmbed();
        const attachment = new MessageAttachment(result.buffer, 'thumbnail.png');
        embed.attachFiles(attachment as any).setThumbnail('attachment://thumbnail.png');

        embed.setTitle(`${msg.author.username}'s Spinda`);
        embed.addField('PID', result.info.pid, true);
        embed.addField('Generated At', result.info.generatedAt.toLocaleString(), true);

        await msg.channel.send(embed);
    }
}