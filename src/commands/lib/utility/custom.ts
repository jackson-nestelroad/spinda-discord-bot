import { Command, CommandCategory, CommandPermission, CommandParameters } from '../base';

export class CustomHelpCommand implements Command {
    public name = 'custom';
    public args = '';
    public description = 'Gives a list of all custom commands registered in this guild.';
    public category = CommandCategory.Utility;
    public permission = CommandPermission.Everyone;

    public async run({ bot, msg, guild }: CommandParameters) {
        const commands = await bot.dataService.getCustomCommands(msg.guild.id);
        const embed = bot.createEmbed();
        embed.setAuthor(`Custom Commands for ${msg.guild.name}`, bot.iconUrl);

        const keys = Object.keys(commands);
        if (keys.length === 0) {
            embed.setDescription('None');
        }
        else {
            const list = keys.map(name => `\`${guild.prefix}${name}\``).join(', ');
            embed.setDescription(list);
        }

        await msg.channel.send(embed);
    }
}