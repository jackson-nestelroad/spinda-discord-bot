import { Interaction } from 'discord.js';
import { BaseEvent, CommandParameters, CommandSource, SlashCommandParameters } from 'panda-discord';

import { CommandPermission, SpindaDiscordBot } from '../bot';
import { CustomCommandFlag } from '../data/model/custom-command';

export class InteractionCreateEvent extends BaseEvent<'interactionCreate', SpindaDiscordBot> {
    constructor(bot: SpindaDiscordBot) {
        super(bot, 'interactionCreate');
    }

    public async run(interaction: Interaction) {
        // Only serve chat input commands
        if (!interaction.isChatInputCommand()) {
            return;
        }

        // User is a bot or in a direct message
        if (interaction.user.bot) {
            return;
        }

        // User is on timeout
        if (this.bot.timeoutService.onTimeout(interaction.user)) {
            return;
        }

        if (interaction.guildId) {
            // User is blocklisted in this guild
            const blocklist = await this.bot.dataService.getBlocklist(interaction.guildId);
            if (blocklist.has(interaction.user.id)) {
                return;
            }
        }

        // Global command
        if (this.bot.commands.has(interaction.commandName)) {
            const params: SlashCommandParameters<SpindaDiscordBot> = {
                bot: this.bot,
                src: new CommandSource(interaction),
                options: interaction.options,
                guildId: interaction.guildId,
                extraArgs: {},
            };

            try {
                const command = this.bot.commands.get(interaction.commandName);
                if (command.disableSlash) {
                    return;
                }
                if (this.bot.validate(params, command)) {
                    await command.executeSlash(params);
                } else {
                    await params.src.reply({ content: 'Permission denied', ephemeral: true });
                }
            } catch (error) {
                this.bot.sendError(params.src, error);
            }
        }
        // Could be a custom (guild) command
        else if (interaction.guildId) {
            const customCommands = await this.bot.dataService.getCustomCommands(interaction.guildId);
            const customCommand = customCommands[interaction.commandName];
            if (customCommand) {
                const params: CommandParameters<SpindaDiscordBot> = {
                    bot: this.bot,
                    src: new CommandSource(interaction),
                    guildId: interaction.guildId,
                    extraArgs: {},
                };
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
    }
}
