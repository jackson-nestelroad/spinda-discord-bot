import { CommandCategory, CommandPermission, CommandParameters, StandardCooldowns, ComplexCommand, ArgumentsConfig, ArgumentType } from '../base';
import { CustomCommandEngine, CustomCommandMetadata } from '../../../events/util/custom-command';
import { ApplicationCommandData, MessageEmbed } from 'discord.js';
import { EmbedTemplates } from '../../../util/embed';
import { ApplicationCommandOptionType } from 'discord-api-types';
import { CustomCommandData, CustomCommandFlag } from '../../../data/model/custom-command';

interface SetCommandArgs {
    command: string;
    message: string;
}

export class SetCommandCommand extends ComplexCommand<SetCommandArgs> {
    public name = 'set-command';
    public description = 'Sets a custom command for the guild that responds with the given message.';
    public moreDescription = 'You may use the following variables in the command message to customize your command\'s response.';
    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;
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

    public addHelpFields(embed: MessageEmbed) {
        Object.entries(CustomCommandEngine.AllOptions).map(([category, options]) => {
            embed.addField(category, options.map(opt => `\`${opt}\``).join(', '));
        });
    }

    public async run({ bot, src }: CommandParameters, args: SetCommandArgs) {
        // Discord allows up to 100 custom slash commands, so we do the same
        const allCustomCommandsForGuild = await bot.dataService.getCustomCommands(src.guild.id);
        if (Object.keys(allCustomCommandsForGuild).length > this.maxCustomCommands) {
            throw new Error(`Cannot exceed custom command limit (${this.maxCustomCommands}).`);
        }

        const command = args.command.toLowerCase();
        if (bot.commands.has(command)) {
            throw new Error(`Cannot overwrite \`${command}\` command.`);
        }

        // Parse all metadata from the code itself
        const { code, values } = CustomCommandEngine.parseMetadata(args.message);
        const description = values.get(CustomCommandMetadata.Description) as string;
        const contentName = values.get(CustomCommandMetadata.ContentName) as string;
        const contentDescription = values.get(CustomCommandMetadata.ContentDescription) as string;

        if (description && description.length > this.maxDescriptionLength) {
            throw new Error(`Description cannot exceed ${this.maxDescriptionLength} characters.`);
        }
        if (contentName && contentName.length > this.maxContentNameLength) {
            throw new Error(`Content name cannot exceed ${this.maxContentNameLength} characters.`);
        }
        if (contentDescription && contentDescription.length > this.maxDescriptionLength) {
            throw new Error(`Content description cannot exceed ${this.maxDescriptionLength} characters.`);
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
        if (values.get(CustomCommandMetadata.NoSlash)) {
            flags |= CustomCommandFlag.DisableSlash;
        }

        const data: CustomCommandData = {
            name: command,
            message: code,
            description: description || 'A custom command.',
            contentName: contentName || 'content',
            contentDescription: contentDescription || 'Message content.',
            flags,
        };

        const oldSlashCommand = src.guild.commands.cache.find(cmd => cmd.name === command);
        if (!(data.flags & CustomCommandFlag.DisableSlash)) {
            // Create slash command for this guild only
            const newSlashCommandData: ApplicationCommandData = {
                name: data.name,
                    description: data.description,
                    options: !(data.flags & CustomCommandFlag.NoContent)
                        ? [
                            { 
                                name: data.contentName,
                                description: data.contentDescription,
                                type: ApplicationCommandOptionType.STRING,
                                required: (data.flags & CustomCommandFlag.ContentRequired) !== 0,
                            },
                        ]
                        : [],
                    defaultPermission: true,
                
            }
            if (oldSlashCommand) {
                await src.guild.commands.edit(oldSlashCommand, newSlashCommandData);
            }
            else {
                await src.guild.commands.create(newSlashCommandData);
            }
        }
        else {
            // Slash command is now disabled on this command
            if (oldSlashCommand) {
                await src.guild.commands.delete(oldSlashCommand);
            }
        }

        // Save to the database last
        // If the slash command creation fails, we don't want a dangling custom command
        await bot.dataService.setCustomCommand(src.guild.id, data);
        
        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(`Successfully set command \`${command}\`.`);
        await src.send(embed);
    }
}