import {
    ArgumentsConfig,
    ArgumentType,
    CommandParameters,
    ComplexCommand,
    EmbedTemplates,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';

interface RemoveCommandArgs {
    command: string;
}

export class RemoveCommandCommand extends ComplexCommand<SpindaDiscordBot, RemoveCommandArgs> {
    public name = 'remove-command';
    public description = 'Removes a custom command that was previously set for the guild.';
    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;
    public cooldown = StandardCooldowns.High;

    public args: ArgumentsConfig<RemoveCommandArgs> = {
        command: {
            description: 'Custom command to remove.',
            type: ArgumentType.String,
            required: true,
        },
    };

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>, args: RemoveCommandArgs) {
        const command = args.command.toLowerCase();

        // Remove slash command first
        const slashCommand = src.guild.commands.cache.find(cmd => cmd.name === command);
        if (slashCommand) {
            await src.guild.commands.delete(slashCommand);
        }

        // Remove from database second
        // If removing slash command fails, we still want the handler to exist
        const removed = await bot.dataService.removeCustomCommand(src.guild.id, command);
        if (!removed) {
            throw new Error(`Command \`${command}\` does not exist.`);
        }

        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(`Successfully removed command \`${command}\`.`);
        await src.send({ embeds: [embed] });
    }
}
