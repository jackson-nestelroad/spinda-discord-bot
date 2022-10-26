import { ApplicationCommandOptionType, ChatInputApplicationCommandData, EmbedBuilder } from 'discord.js';
import {
    ArgumentType,
    ArgumentsConfig,
    CommandParameters,
    ComplexCommand,
    EmbedTemplates,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';
import { CustomCommandEngine, CustomCommandMetadata } from '../../../custom-commands/custom-command-engine';
import { CustomCommandData, CustomCommandFlag } from '../../../data/model/custom-command';

interface SetCommandArgs {
    command: string;
    message: string;
}

export class SetCommandCommand extends ComplexCommand<SpindaDiscordBot, SetCommandArgs> {
    public name = 'set-command';
    public description = 'Sets a custom command for the guild that responds with the given message.';
    public moreDescription =
        "You may use the following variables in the command message to customize your command's response.";
    public category = CommandCategory.Config;
    public permission = CommandPermission.Moderator;
    public cooldown = StandardCooldowns.High;

    public args: ArgumentsConfig<SetCommandArgs> = {
        command: {
            description: 'New command name.',
            type: ArgumentType.String,
            required: true,
        },
        message: {
            description: 'Command response, which can contain programming.',
            type: ArgumentType.RestOfContent,
            required: true,
        },
    };

    private readonly maxDescriptionLength = 100;
    private readonly maxContentNameLength = 32;
    private readonly maxCustomCommands = 100;

    public addHelpFields(embed: EmbedBuilder) {
        Object.entries(CustomCommandEngine.AllOptions).map(([category, options]) => {
            embed.addFields({ name: category, value: options.map(opt => `\`${opt}\``).join(', ') });
        });
    }

    public async run(params: CommandParameters<SpindaDiscordBot>, args: SetCommandArgs) {
        const { bot, src, guildId } = params;

        // Discord allows up to 100 custom slash commands, so we do the same
        const allCustomCommandsForGuild = await bot.dataService.getCustomCommands(src.guild.id);
        if (Object.keys(allCustomCommandsForGuild).length > this.maxCustomCommands) {
            throw new Error(`Cannot exceed custom command limit (${this.maxCustomCommands}).`);
        }

        const commandName = args.command.toLowerCase();
        if (!/^[\w-]{1,32}$/.test(commandName)) {
            throw new Error(`Invalid command name: \`${commandName}\`.`);
        }
        if (bot.commands.has(commandName)) {
            throw new Error(`Cannot overwrite \`${commandName}\` command.`);
        }

        const commands = await bot.dataService.getCustomCommands(guildId);
        const customCommand = commands[commandName];
        if (customCommand && !bot.meetsPermission(params, CommandPermission[customCommand.permission])) {
            throw new Error('You may not overwrite a command you do not have permission to run.');
        }

        // Parse all metadata from the code itself
        const { code, values } = CustomCommandEngine.parseMetadata(args.message);
        const description = values.get(CustomCommandMetadata.Description) as string;
        const contentName = values.get(CustomCommandMetadata.ContentName) as string;
        const contentDescription = values.get(CustomCommandMetadata.ContentDescription) as string;
        let permission = values.get(CustomCommandMetadata.Permission) as keyof typeof CommandPermission;

        if (description && description.length > this.maxDescriptionLength) {
            throw new Error(`Description cannot exceed ${this.maxDescriptionLength} characters.`);
        }
        if (contentName && contentName.length > this.maxContentNameLength) {
            throw new Error(`Content name cannot exceed ${this.maxContentNameLength} characters.`);
        }
        if (contentDescription && contentDescription.length > this.maxDescriptionLength) {
            throw new Error(`Content description cannot exceed ${this.maxDescriptionLength} characters.`);
        }
        if (permission) {
            const matchedKey = Object.keys(CommandPermission).find(
                key => permission.localeCompare(key, undefined, { sensitivity: 'base' }) === 0,
            );
            if (!matchedKey || CommandPermission[matchedKey].hidden) {
                throw new Error('Unknown permission.');
            } else if (!bot.meetsPermission(params, CommandPermission[matchedKey])) {
                throw new Error('You may not create a command you do not have permission to run.');
            }
            permission = matchedKey as keyof typeof CommandPermission;
        }
        if (!code) {
            throw new Error(`Command message cannot be empty (after metadata parsing).`);
        }

        let flags = CustomCommandFlag.None;
        if (values.get(CustomCommandMetadata.NoContent)) {
            flags |= CustomCommandFlag.NoContent;
        }
        if (values.get(CustomCommandMetadata.ContentRequired)) {
            flags |= CustomCommandFlag.ContentRequired;
        }
        if (values.get(CustomCommandMetadata.Slash)) {
            flags |= CustomCommandFlag.EnableSlash;
        }

        const data: CustomCommandData = {
            name: commandName,
            message: code,
            description: description || 'A custom command.',
            contentName: contentName || 'content',
            contentDescription: contentDescription || 'Message content.',
            permission: permission || 'Everyone',
            flags,
        };

        const oldSlashCommand = src.guild.commands.cache.find(cmd => cmd.name === commandName);
        if (data.flags & CustomCommandFlag.EnableSlash) {
            // Create slash command for this guild only
            const newSlashCommandData: ChatInputApplicationCommandData = {
                name: data.name,
                description: data.description,
                options: !(data.flags & CustomCommandFlag.NoContent)
                    ? [
                          {
                              name: data.contentName,
                              description: data.contentDescription,
                              type: ApplicationCommandOptionType.String,
                              required: (data.flags & CustomCommandFlag.ContentRequired) !== 0,
                          },
                      ]
                    : [],
                defaultMemberPermissions: CommandPermission[data.permission].memberPermissions ?? null,
                dmPermission: null,
            };
            if (oldSlashCommand) {
                await src.guild.commands.edit(oldSlashCommand, newSlashCommandData);
            } else {
                await src.guild.commands.create(newSlashCommandData);
            }
        } else {
            // Slash command is now disabled on this command
            if (oldSlashCommand) {
                await src.guild.commands.delete(oldSlashCommand);
            }
        }

        // Save to the database last
        // If the slash command creation fails, we don't want a dangling custom command
        await bot.dataService.setCustomCommand(src.guild.id, data);

        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(`Successfully set command \`${commandName}\`.`);
        await src.send({ embeds: [embed] });
    }
}
