import { EmbedTemplates } from '../../../util/embed';
import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';

export class RemoveCommandCommand extends Command {
    public name = 'remove-command';
    public args = 'command';
    public description = 'Removes a custom command that was previously set for the guild.';
    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;
    public cooldown = StandardCooldowns.High;

    public async run({ bot, msg, args }: CommandParameters) {
        if (args.length === 0) {
            return;
        }

        const command = args[0];
        const removed = await bot.dataService.removeCustomCommand(msg.guild.id, command);
        if (!removed) {
            throw new Error(`Command \`${command}\` does not exist.`);
        }
        
        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(`Successfully removed command \`${command}\`.`);
        await msg.channel.send(embed);
    }
}