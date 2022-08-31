import {
    ArgumentType,
    ArgumentsConfig,
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
    public permission = CommandPermission.Moderator;
    public cooldown = StandardCooldowns.High;

    public args: ArgumentsConfig<RemoveCommandArgs> = {
        command: {
            description: 'Custom command to remove.',
            type: ArgumentType.String,
            required: true,
        },
    };

    public async run(params: CommandParameters<SpindaDiscordBot>, args: RemoveCommandArgs) {
        const { bot, src, guildId } = params;

        const commandName = args.command.toLowerCase();
        const commands = await bot.dataService.getCustomCommands(guildId);
        const customCommand = commands[commandName];
        if (customCommand && !bot.meetsPermission(params, CommandPermission[customCommand.permission])) {
            throw new Error('You may not delete a command you do not have permission to run.');
        }

        // Remove slash command first
        const slashCommand = src.guild.commands.cache.find(cmd => cmd.name === commandName);
        if (slashCommand) {
            await src.guild.commands.delete(slashCommand);
        }

        // Remove from database second
        // If removing slash command fails, we still want the handler to exist
        const removed = await bot.dataService.removeCustomCommand(src.guild.id, commandName);
        if (!removed) {
            throw new Error(`Command \`${commandName}\` does not exist.`);
        }

        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(`Successfully removed command \`${commandName}\`.`);
        await src.send({ embeds: [embed] });
    }
}
