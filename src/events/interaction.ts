import { Interaction } from 'discord.js';
import { DiscordBot } from '../bot';
import { CommandParameters, SlashCommandParameters } from '../commands/lib/base';
import { CustomCommandFlag } from '../data/model/custom-command';
import { CommandSource } from '../util/command-source';
import { BaseEvent } from './base';
import { CustomCommandEngine } from './util/custom-command';
import { Validation } from './util/validate';

const event = 'interaction';

export class InteractionEvent extends BaseEvent<typeof event> {
    constructor(bot: DiscordBot) {
        super(bot, event);
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
            const params: SlashCommandParameters = {
                bot: this.bot,
                src: new CommandSource(interaction),
                options: interaction.options,
                guild,
            };

            try {
                const command = this.bot.commands.get(interaction.commandName);
                if (Validation.validate(params, command, params.src.member)) {
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
                const params: CommandParameters = {
                    bot: this.bot,
                    src: new CommandSource(interaction),
                    guild,
                };
                try {
                    const content = (customCommand.flags & CustomCommandFlag.NoContent)
                    ? ''
                    : interaction.options.get(customCommand.contentName).value as string;
                    
                    await new CustomCommandEngine(params, content).run(customCommand.message);
                } catch (error) {
                    await this.bot.sendError(params.src, error);
                }
            }
        }
    }
}