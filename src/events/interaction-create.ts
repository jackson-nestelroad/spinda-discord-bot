import { Interaction } from 'discord.js';
import { BaseEvent, CommandParameters, CommandSource, SlashCommandParameters } from 'panda-discord';

import { SpindaDiscordBot } from '../bot';
import { CustomCommandFlag } from '../data/model/custom-command';

export class InteractionCreateEvent extends BaseEvent<'interactionCreate', SpindaDiscordBot> {
    constructor(bot: SpindaDiscordBot) {
        super(bot, 'interactionCreate');
    }

    public async run(interaction: Interaction) {
        // Only serve commands
        if (!interaction.isCommand()) {
            return;
        }

        // User is a bot or in a direct message
        if (interaction.user.bot || interaction.guild === null) {
            return;
        }

        // User is on timeout
        if (this.bot.timeoutService.onTimeout(interaction.user)) {
            return;
        }

        // User is blocklisted in this guild
        const blocklist = await this.bot.dataService.getBlocklist(interaction.guild.id);
        if (blocklist.has(interaction.user.id)) {
            return;
        }

        const guild = await this.bot.dataService.getGuild(interaction.guild.id);

        // Global command
        if (this.bot.commands.has(interaction.commandName)) {
            const params: SlashCommandParameters<SpindaDiscordBot> = {
                bot: this.bot,
                src: new CommandSource(interaction),
                options: interaction.options,
                guildId: guild.id,
                extraArgs: {},
            };

            try {
                const command = this.bot.commands.get(interaction.commandName);
                if (this.bot.validate(params, command)) {
                    await command.executeSlash(params);
                }
            } catch (error) {
                this.bot.sendError(params.src, error);
            }
        }
        // Could be a custom (guild) command
        else {
            const customCommands = await this.bot.dataService.getCustomCommands(interaction.guild.id);
            const customCommand = customCommands[interaction.commandName];
            if (customCommand) {
                const params: CommandParameters<SpindaDiscordBot> = {
                    bot: this.bot,
                    src: new CommandSource(interaction),
                    guildId: guild.id,
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
                    });
                } catch (error) {
                    await this.bot.sendError(params.src, error);
                }
            }
        }
    }
}
