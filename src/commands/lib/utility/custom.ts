import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';

export class CustomHelpCommand extends Command {
    public name = 'custom';
    public args = '(command)';
    public description = 'Gives a list of all custom commands registered in this guild.';
    public category = CommandCategory.Utility;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Low;

    public async run({ bot, msg, args, guild }: CommandParameters) {
        const commands = await bot.dataService.getCustomCommands(msg.guild.id);
        const embed = bot.createEmbed();
        embed.setAuthor(`Custom Commands for ${msg.guild.name}`, msg.guild.iconURL());

        if (args.length === 0) {
            const keys = Object.keys(commands);
            if (keys.length === 0) {
                embed.setDescription('None');
            }
            else {
                const list = keys.map(name => `\`${guild.prefix}${name}\``).join(', ');
                embed.setDescription(list);
            }
        }
        else {
            const cmd = args[0];
            if (commands[cmd]) {
                embed.setTitle(`${guild.prefix}${cmd}`);
                embed.setDescription(`\`${commands[cmd]}\``);
            }
            else {
                throw new Error(`Custom command \`${cmd}\` does not exist.`);
            }
        }

        await msg.channel.send(embed);
    }
}