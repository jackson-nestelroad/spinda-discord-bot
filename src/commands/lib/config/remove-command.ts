import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';

export class RemoveCommandCommand extends Command {
    public name = 'remove-command';
    public args = 'command';
    public description = 'Removes a custom command that was previously set for the guild.';
    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;
    public cooldown = StandardCooldowns.high;

    public async run({ bot, msg, args }: CommandParameters) {
        if (args.length === 0) {
            return;
        }

        const command = args[0];
        const removed = await bot.dataService.removeCustomCommand(msg.guild.id, command);
        if (!removed) {
            throw new Error(`Command \`${command}\` does not exist.`);
        }
        
        const embed = bot.createEmbed({ footer: false, timestamp: false, success: true });
        embed.setDescription(`Successfully removed command \`${command}\`.`);
        await msg.channel.send(embed);
    }
}