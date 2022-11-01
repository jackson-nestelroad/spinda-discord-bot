import { Interaction } from 'discord.js';
import {
    CommandInteractionCommandSource,
    CommandSource,
    InteractionCommandParameters,
    SlashCommandParameters,
} from 'panda-discord';

import { CommandPermission, SpindaDiscordBot } from '../bot';
import { CustomCommandFlag } from '../data/model/custom-command';
import { BaseInteractionEvent } from './base-interaction';

export class InteractionCreateEvent extends BaseInteractionEvent {
    public async run(interaction: Interaction) {
        if (!(await this.shouldProcess(interaction))) {
            return;
        }

        // Only serve commands in this handler.
        if (!interaction.isCommand()) {
            return;
        }

        if (interaction.isChatInputCommand()) {
            const params: SlashCommandParameters<SpindaDiscordBot> = {
                bot: this.bot,
                src: new CommandSource(interaction) as CommandInteractionCommandSource,
                options: interaction.options,
                guildId: interaction.guildId,
                extraArgs: {},
            };

            // Global command
            if (this.bot.commands.has(interaction.commandName)) {
                try {
                    const command = this.bot.commands.get(interaction.commandName);
                    if (command.disableSlash) {
                        return;
                    }
                    await command.executeSlash(params);
                } catch (error) {
                    await this.bot.sendError(params.src, error);
                }
            } else if (interaction.guildId) {
                // Could be a custom (guild) command
                const customCommands = await this.bot.dataService.getCustomCommands(interaction.guildId);
                const customCommand = customCommands[interaction.commandName];
                if (customCommand) {
                    try {
                        const content =
                            customCommand.flags & CustomCommandFlag.NoContent
                                ? ''
                                : (interaction.options.get(customCommand.contentName)?.value as string);

                        await this.bot.customCommandService.run(customCommand.message, {
                            params,
                            content,
                            permission: CommandPermission[customCommand.permission],
                        });
                    } catch (error) {
                        await this.bot.sendError(params.src, error);
                    }
                }
            }
        } else if (interaction.isContextMenuCommand()) {
            const params: InteractionCommandParameters<SpindaDiscordBot> = {
                bot: this.bot,
                src: new CommandSource(interaction) as CommandInteractionCommandSource,
                guildId: interaction.guildId,
                extraArgs: {},
            };
            if (this.bot.contextMenuCommands.has(interaction.commandName)) {
                try {
                    const command = this.bot.contextMenuCommands.get(interaction.commandName);
                    await command.execute(params);
                } catch (error) {
                    await this.bot.sendError(params.src, error);
                }
            }
        } else {
            throw new Error(`Unknown command interaction type.`);
        }
    }
}
