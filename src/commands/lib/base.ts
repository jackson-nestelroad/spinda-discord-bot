import { ApplicationCommandOptionType } from 'discord-api-types';
import { ApplicationCommandData, ApplicationCommandOption, ApplicationCommandOptionChoice, Collection, CommandInteractionOption, MessageEmbed, Snowflake } from 'discord.js';
import { DiscordBot } from '../../bot';
import { GuildAttributes } from '../../data/model/guild';
import { DiscordUtil } from '../../util/discord';
import { CommandSource } from '../../util/command-source';
import { ExpireAge, ExpireAgeFormat, TimedCache } from '../../util/timed-cache';
import { Validation } from '../../events/util/validate';

// Every command category for this bot
export enum CommandCategory {
    Config = 'Config',
    Utility = 'Utility',
    Fun = 'Fun',
    Spinda = 'Spinda',
    External = 'External',
    Pokengine = 'Pok\u00E9ngine',
    Secret = 'Secret',
    Custom = 'Custom',
}

// Supported command permissions
export enum CommandPermission {
    Owner,
    Administrator,
    Everyone,
}

// Argument types supported by the internal parser
export enum ArgumentType {
    String = 3,                 // A single string
                                // Chat commands will parse as one string with no spaces
                                // Slash commands will allow spaces

    Integer = 4,                // An integer
                                // For floating point numbers, use String and parsing inside the command

    Boolean = 5,                // A boolean value
                                // Slash commands give "True" or "False"
                                // Chat commands allow any capitalization of those word

    User = 6,                   // A valid member of the current guild
                                // Slash commands will give a mention, which corresponds to a GuildObject
                                // Chat commands will allow a mention, user ID, or username
                                
    Channel = 7,                // A channel in the currnt guild
                                // Slash commands will give a mention, which corresponds to a Channel
                                // Chat commands will allow a mention, channel ID, or channel name

    Role = 8,                   // A role in the current guild
                                // Slash commands will give a mention, which corresponds to a Role
                                // Chat commands will allow a mention, role ID, or role name

    RestOfContent = 100,        // The rest of the content in the message that has not been parsed
                                // Chat commands implement this trivially in parsing
                                // Slash commands implement this as a string, since they can take spaces

                                // Unsupported types:
                                // SUB_COMMAND
                                // SUB_COMMAND_GROUP
                                // MENTIONABLE
}

// Configuration for a single argument
// This is slightly different than what Discord offers since we handle sub-commands differently
export interface SingleArgumentConfig {
    description: string;
    type: ArgumentType;
    required: boolean;
    choices?: ApplicationCommandOptionChoice[];
}

// Disable these types, as they are unneeded for this bot or handled differently
export type RestrictedCommandOptionType = Exclude<
    ApplicationCommandOptionType,
    ApplicationCommandOptionType.SUB_COMMAND | ApplicationCommandOptionType.SUB_COMMAND_GROUP | ApplicationCommandOptionType.MENTIONABLE
>;

// Parameters given to all commands, whether running as a chat command or slash command
export interface CommandParameters {
    bot: DiscordBot,
    guild: GuildAttributes,
    src: CommandSource,
}

// Parameters exclusive to chat commands
export interface ChatCommandParameters extends CommandParameters {
    args: string[],
    content: string,
}

// Parameters exclusive to slash commands
export interface SlashCommandParameters extends CommandParameters {
    options: Collection<string, CommandInteractionOption>;
}

// Standard cooldowns available for any command to use
const StandardCooldownObject = {
    Low: { seconds: 3 },
    Medium: { seconds: 5 },
    High: { seconds: 10 },
    Minute: { minutes: 1 },
} as const;

// Better typing for the above cooldowns
export const StandardCooldowns: Readonly<Record<keyof typeof StandardCooldownObject, Readonly<ExpireAgeFormat>>> = StandardCooldownObject;

// Array of command types that can be instantiated
export type CommandTypeArray<Shared = any> = Array<{ new(): BaseCommand<Shared> }>;

// Maps a command name to the command that handles it
export type CommandMap<K, Shared = any> = Map<K, BaseCommand<Shared>>;

// Functions that internally modify command fields
// These functions should not be exposed externally
namespace InternalCommandModifiers {
    export function setShared<Shared>(cmd: BaseCommand<Shared>, shared: Shared) {
        cmd['shared' as string] = shared;
    }

    export function setParent<Shared>(child: BaseCommand<Shared>, parent: BaseCommand<Shared>) {
        child['parentCommand' as string] = parent;
    }
}

/*

    The following classes and interfaces make up the command framework.
    The primary goal of this framework is to allow chat commands (over
        message) and slash commands (over interaction) to be handled
        using the same code.
    This framework also aims to minimize command handling code, especially
        in terms of parsing arguments.

    The command framework has the following structure:


                            BaseCommand
                                |
          -------------------------------------------------                 
          |                     |                         |
    SimpleCommand       ParameterizedCommand        NestedCommand
                                |
                        ------------------------
                        |                      |
                ComplexCommand          LegacyCommand


    BaseCommand ---             The base type that all commands derive from. Represents
                                any command that can be run as a chat or slash command.
    SimpleCommand ---           A command that takes no arguments. Only the command name
                                is needed to run the command.
    ParameterizedCommand ---    A command that takes one or more arguments. This command
                                requires an ArgumentsConfig object to set up slash commands
                                and internal parsing.
    ComplexCommand ---          A parameterized command that uses the internal parser for
                                chat commands. The chat command parser aims to parse
                                arguments in a very similar way to how slash commands
                                are automatically parsed.
    LegacyCommand ---           A parameterized command that specifies custom parsing for
                                chat commands. Commands that specify arguments using
                                special formatting must use their own parser.
    NestedCommand ---           A command with one level of sub-commands. Nested commands
                                delegate running the command to a sub-command based on the
                                first argument.

    Furthermore, there are generic types across each class.
    Args ---                    An interface that is provided to the implementation-specific
                                command handler. An Args object is produced by all internal
                                and legacy parsers.
    Shared ---                  The type of the `BaseCommand.shared` object, which provides
                                data and methods that can be used across a nested command
                                chain. Commands that do not have sub-commands use the `never`
                                type to communicate that there is never shared data, while
                                nested commands provide shared data to its sub-commands.

    See the following commands and how they would be represented in this framework:
        
        /ping ---                       BaseCommand >>> SimpleCommand
                No arguments, so this command is simple.

        /8ball (question) ---           BaseCommand >>> ParameterizedCommand >>> ComplexCommand
                One argument which is trivial to parse, so this command is complex.

        /say (#channel) message ---     BaseCommand >>> ParameterizedCommand >>> LegacyCommand
                Two arguments, but they are not trivial to parse, since the `#channel`
                argument may or may not be specified. This would obviously be trivial
                as a slash command, but it needs special parsing if ran as a chat
                command, so a legacy command works well here.
        
        /message-listener add code ---  BaseCommand >>> NestedCommand
        /message-listener remove id
                This command could be represented as a ComplexCommand with two arguments,
                but the first argument changes how the command works. The `add` sub-command
                takes in code (which can be the rest of the message's content), while the
                `remove` sub-command takes in a single integer. This scenario suits the use
                case for a nested command, which will then have two sub-command objects, both
                represented as a complex command.

*/


// Optional fields for command handlers
export interface BaseCommand<Shared = any> {
    // Prefix of the command for descriptions and messages
    // Mostly a legacy field that goes mostly unused
    readonly prefix?: string;

    // More description exclusively available on the help page
    readonly moreDescription?: string | string[];

    // Cooldown between multiple uses of the command
    // Default is no cooldown
    readonly cooldown?: ExpireAge;

    // Examples for the help page
    readonly examples?: string[];

    // Prevent this command from being ran inside of a custom command
    // Default is false, which allows commands to run inside of custom commands
    readonly disableInCustomCommand?: boolean;

    // Prevent this command from being added as a slash command
    // Default is conditional on the command's permission
    readonly disableSlash?: boolean;

    // The guild this command should be added to as a slash command
    // If left blank, it is added as a global slash command
    readonly slashGuildId?: Snowflake;

    // A flag that signals to the outside world if this command should
    // be treated as a nested command
    // Do not set this manually implementation classes
    readonly isNested?: boolean;

    // Map of sub-commands, which is only useful if the command is nested
    readonly subCommandMap?: CommandMap<string, Shared>;

    // Add any additional fields to the help page if desired
    addHelpFields?(embed: MessageEmbed): void;
}

// Any command that can run as a chat or slash command
// Do not inherit directly from this!
export abstract class BaseCommand<Shared = any> {
    // Name of the command, which is used to run the command
    public abstract readonly name: string;

    // Description of the command that appears on the slash command screen
    // and the help page
    public abstract readonly description: string;

    // Category of the command
    public abstract readonly category: CommandCategory;

    // Specifies the level of permission needed to run the command
    public abstract readonly permission: CommandPermission;

    // Optional object for specifying the arguments the command takes
    public abstract readonly args?: ReadonlyDictionary<SingleArgumentConfig>;

    // An object that provides shared access to data inside of this command handler
    // Only used for sub-commands to share common data
    protected readonly shared: Shared;

    // The parent of this command if it is a sub-command
    protected readonly parentCommand: Shared extends never ? never : BaseCommand<Shared>;

    // Maps user IDs to the number of times they have tried to use this command
    // before their cooldown has finished
    private cooldownSet: TimedCache<Snowflake, number> = null;

    // Checks if the command should be created as a slash command
    public get isSlashCommand(): boolean {
        // Command must be public
        return !this.disableSlash && this.permission === CommandPermission.Everyone && this.category !== CommandCategory.Secret;
    }

    // Generates the full description to display on the help page
    public fullDescription(): string {
        if (!this.moreDescription) {
            return this.description;
        }
        if (Array.isArray(this.moreDescription)) {
            return this.description + '\n\n' + this.moreDescription.join('\n\n');
        }
        return this.description + '\n\n' + this.moreDescription;
    }

    // Generates symbolic form of command arguments for the help page
    public abstract argsString(): string;

    // Generates data to be used for slash command configuration
    public abstract commandData(): ApplicationCommandData;

    // Runs the command when it is called from a message
    public abstract runChat(params: ChatCommandParameters): Promise<void>;

    // Runs the command when it is called from an interaction
    public abstract runSlash(params: SlashCommandParameters): Promise<void>;

    protected throwConfigurationError(msg: string) {
        throw new Error(`Configuration error for command "${this.name}": ${msg}`);
    }

    // Initializes the internal state of the command and performs a few validation tests
    public initialize(): void {
        if (/\s/.test(this.name)) {
            this.throwConfigurationError('Command names may not include whitespace.');
        }
        
        if (this.cooldown !== undefined) {
            this.cooldownSet = new TimedCache(this.cooldown);
            if (this.cooldownSet.expireAge <= 0) {
                this.cooldownSet = null;
            }
        }
    }

    // Executes the command as a chat command
    public async executeChat(params: ChatCommandParameters): Promise<void> {
        if (await params.bot.handleCooldown(params.src, this.cooldownSet)) {
            return this.runChat(params);
        }
    }

    // Executes the command as a slash command
    public async executeSlash(params: SlashCommandParameters): Promise<void> {
        if (await params.bot.handleCooldown(params.src, this.cooldownSet)) {
            return this.runSlash(params);
        }
    }
}

// A command that takes no other arguments besides its name
export abstract class SimpleCommand<Shared = never> extends BaseCommand<Shared> {
    public args = null;
    public isNested: false = false;

    // Generalized command handler for both chat and slash commands
    public abstract run(params: CommandParameters): Promise<void>;

    public argsString(): string {
        return '';
    }

    public commandData(): ApplicationCommandData {
        return {
            name: this.name,
            description: this.description,
            options: [],
            defaultPermission: this.permission === CommandPermission.Everyone,
        }
    }

    // Avoid any parsing of the message content, because it doesn't matter
    public async runChat(params: ChatCommandParameters) {
        return this.run(params);
    }

    public async runSlash(params: SlashCommandParameters) {
        return this.run(params);
    }
}

// Object for configuring arguments accepted and used by the command
export type ArgumentsConfig<Args> = { readonly [arg in keyof Args]-?: SingleArgumentConfig };

// A command that takes one or more arguments
abstract class ParameterizedCommand<Args extends object, Shared = never> extends BaseCommand<Shared> {
    // Stronger typing for the args configuration
    public abstract readonly args: ArgumentsConfig<Args>;

    // Generalized command handler for chat and slash commands
    public abstract run(params: CommandParameters, args: Args): Promise<void>;

    private static convertArgumentType(type: ArgumentType): ApplicationCommandOptionType {
        switch (type) {
            case ArgumentType.RestOfContent: return ApplicationCommandOptionType.STRING;
            default: return type as number as ApplicationCommandOptionType;
        }
    }

    // Validates the arguments config object is possible to use
    private validateArgumentConfig(): void {
        // Non-required arguments must be listed last (consecutively)
        // RestOfContent argument can only be at the very end
        
        let nonRequiredFound = false;
        let restOfContentFound = false;
        for (const name in this.args) {
            const data: SingleArgumentConfig = this.args[name];
            if (restOfContentFound) {
                this.throwConfigurationError(`RestOfContent arguments must be configured last.`);
            }
            restOfContentFound = data.type === ArgumentType.RestOfContent;

            if (nonRequiredFound && data.required) {
                this.throwConfigurationError(`Non-required arguments must be configured last.`);
            }

            nonRequiredFound = !data.required;
        }
    }
   
    public commandData(): ApplicationCommandData {
        // Validate argument config at setup time
        this.validateArgumentConfig();

        return {
            name: this.name,
            description: this.description,
            options: Object.entries(this.args).map(([name, data]: [string, SingleArgumentConfig]) => {
                    return {
                        name,
                        description: data.description,
                        type: ParameterizedCommand.convertArgumentType(data.type),
                        required: data.required,
                        choices: data.choices
                    };
                }),
            defaultPermission: this.permission === CommandPermission.Everyone,
        }
    }

    // Shared parsing for slash commands
    // Trivial since all arguments are parsed by Discord
    public async runSlash(params: SlashCommandParameters): Promise<void> {
        // No parsing needed for slash commands
        // Discord has already done it for us!
        // Just pick the right part of the option object depending on the type
        const parsedOptions: Args = params.options.reduce((obj, option) => {
            const next = { ...obj };
            switch (DiscordUtil.ApplicationCommandOptionTypeConverter[option.type]) {
                case ApplicationCommandOptionType.USER: next[option.name] = option.member; break;
                case ApplicationCommandOptionType.CHANNEL: next[option.name] = option.channel; break;
                case ApplicationCommandOptionType.ROLE: next[option.name] = option.role; break;
                default: next[option.name] = option.value;
            }
            return next;
        }, { } as Args);
        return this.run(params, parsedOptions);
    }
}

export interface ComplexCommand<Args extends object, Shared = never> {
    // Suppresses chat arguments parsing errors, allowing the command to run anyway
    // If true, input validation should be done in the command handler
    readonly suppressChatArgumentsError?: boolean;
}

// A command that automatically parses chat and slash arguments the same way
export abstract class ComplexCommand<Args extends object, Shared = never> extends ParameterizedCommand<Args, Shared> {
    public isNested: false = false;

    public argsString(): string {
        return Object.entries(this.args).map(([name, data]: [string, SingleArgumentConfig]) => {
            if (!data.required) {
                return `(${name})`;
            }
            else {
                return name;
            }
        }).join(' ');
    }

    // Parses chat commands to make them appear like slash commands
    public async runChat(params: ChatCommandParameters): Promise<void> {
        // Parse message according to arguments configuration
        // This allows chat commands to behave almost exactly like slash commands
        // However, there are a few limitations:
            // Chat arguments are separated by space, while slash arguments are separated by the client
            // Chat arguments must be listed sequentially, while slash arguments can be out of order
                // This allows later optional arguments to be defined while others are not
                // Commands should consider this a possibility now
                // Later optional commands cannot entirely depend on the presence of previous optional commands
        const parsed: Partial<Args> = { };
        let i = 0;
        for (const entry of Object.entries(this.args)) {
            // arg is really of type "keyof T"
            const [arg, data] = entry as [string, SingleArgumentConfig];
            let nextArg = params.args[i];
            
            if (i >= params.args.length) {
                if (data.required) {
                    if (!this.suppressChatArgumentsError) {
                        throw new Error(`Missing required argument \`${arg}\`.`);
                    }
                }
                else {
                    parsed[arg] = undefined;
                    continue;
                }
            }
            
            switch (data.type) {
                case ArgumentType.RestOfContent: {
                    nextArg = params.args.slice(i).join(' ');
                    i = params.args.length;
                } // follow through
                case ArgumentType.String: {
                    if (data.choices) {
                        const choice = data.choices.find(choice => DiscordUtil.accentStringEqual(choice.name, nextArg));
                        if (choice === undefined && !this.suppressChatArgumentsError) {
                            throw new Error(`Invalid value \`${nextArg}\` for argument \`${arg}\`.`);
                        }
                        parsed[arg] = choice.value;
                    }
                    else {
                        parsed[arg] = nextArg;
                    }
                } break;
                case ArgumentType.Boolean: {
                    if (DiscordUtil.accentStringEqual('true', nextArg)) {
                        parsed[arg] = true;
                    }
                    else if (DiscordUtil.accentStringEqual('false', nextArg)) {
                        parsed[arg] = false;
                    }
                    else if (!this.suppressChatArgumentsError) {
                        throw new Error(`Invalid boolean value \`${nextArg}\` for argument \`${arg}\`.`);
                    }
                } break;
                case ArgumentType.Integer: {
                    if (data.choices) {
                        const choice = data.choices.find(choice => DiscordUtil.accentStringEqual(choice.name, nextArg));
                        if (choice === undefined && !this.suppressChatArgumentsError) {
                            throw new Error(`Invalid value \`${nextArg}\` for argument \`${arg}\`.`);
                        }
                        parsed[arg] = choice.value;
                    }                    
                    else {
                        const num = parseInt(nextArg);
                        if (isNaN(num) && !this.suppressChatArgumentsError) {
                            throw new Error(`Invalid integer value \`${nextArg}\` for argument \`${arg}\`.`);
                        }
                        parsed[arg] = num;
                    }
                } break;
                case ArgumentType.Channel: {
                    const channel = params.bot.getChannelFromString(nextArg, params.guild.id);
                    if (!channel && !this.suppressChatArgumentsError) {
                        throw new Error(`Invalid channel \`${nextArg}\` for argument \`${arg}\`.`);
                    }
                    parsed[arg] = channel;
                } break;
                case ArgumentType.Role: {
                    const role = params.bot.getRoleFromString(nextArg, params.guild.id);
                    if (!role && !this.suppressChatArgumentsError) {
                        throw new Error(`Invalid role \`${nextArg}\` for argument \`${arg}\`.`);
                    }
                    parsed[arg] = role;
                } break;
                case ArgumentType.User: {
                    const member = await params.bot.getMemberFromString(nextArg, params.guild.id);
                    if (!member && !this.suppressChatArgumentsError) {
                        throw new Error(`Invalid guild member \`${nextArg}\` for argument \`${arg}\`.`);
                    }
                    parsed[arg] = member;
                } break;
            }
            ++i;
        }
        return this.run(params, parsed as Args);
    }
}

// A command that implements its own parsing within the command itself
// Some commands have very complex parsing methods, which make slash commands impractical
// Thus, legacy commands allow chat-only commands to be expressed without having to set up an arguments object
// The `lib/fun/screenshot` command is a good example of this
export abstract class LegacyCommand<Args extends object, Shared = never> extends ParameterizedCommand<Args, Shared> {
    public isNested: false = false;

    // Custom parser for chat commands
    protected abstract parseChatArgs(params: ChatCommandParameters): Args;

    public async runChat(params: ChatCommandParameters) {
        return this.run(params, this.parseChatArgs(params));
    }
}

// A command that delegates to sub-commands
// Currently only one level of nesting is supported
export abstract class NestedCommand<Shared = void> extends BaseCommand<Shared> {
    public args = null;
    public isNested: true = true;

    // Configuration array of sub-command types to initialize internally
    public abstract subCommands: CommandTypeArray<Shared>;

    // Actual sub-command map to delegate commands to
    public subCommandMap: CommandMap<string, Shared>;

    // Creates the object that will be shared with all children of this nested command
    public abstract initializeShared(): Shared;

    public argsString() {
        return `(${[...this.subCommandMap.keys()].join(' | ')})`;
    }

    public initialize() {
        super.initialize();

        if (this.subCommands.length === 0) {
            this.throwConfigurationError(`Sub-command array cannot be empty.`); 
        }
        if (this.subCommands.length > 25) {
            this.throwConfigurationError(`Command can only have up to 25 sub-commands.`);
        }

        // Set up all sub-command instances
        InternalCommandModifiers.setShared(this, this.initializeShared());
        this.subCommandMap = new Map();
        for (const cmd of this.subCommands) {
            const instance = new cmd();
            instance.initialize();
            InternalCommandModifiers.setShared(instance, this.shared);
            InternalCommandModifiers.setParent(instance, this);

            if (instance.isNested) {
                this.throwConfigurationError(`Sub-command ${instance.name} is nested, but commands only support 1 level of nesting.`);
            }

            this.subCommandMap.set(instance.name, instance);
        }
    }

    public commandData(): ApplicationCommandData {
        const data = { } as ApplicationCommandData;

        data.name = this.name;
        data.description = this.description;
        data.defaultPermission = this.permission === CommandPermission.Everyone;
        data.options = [];

        for (const [key, cmd] of [...this.subCommandMap.entries()]) {
            const subData = cmd.commandData();
            data.options.push({
                name: cmd.name,
                description: cmd.description,
                type: ApplicationCommandOptionType.SUB_COMMAND,
                options: subData.options as ApplicationCommandOption[],
            });
        }

        return data;
    }

    public addHelpFields(embed: MessageEmbed) {
        embed.addField('Sub-Commands', [...this.subCommandMap.keys()].map(key => `\`${key}\``).join(', '));
    }

    // Delegates a chat command to a sub-command
    public async runChat(params: ChatCommandParameters) {
        if (params.args.length === 0) {
            throw new Error(`Missing sub-command for command \`${this.name}\`.`);
        }

        const subName = params.args.shift();

        if (this.subCommandMap.has(subName)) {
            const subNameIndex = params.content.indexOf(subName);
            if (subNameIndex === -1) {
                throw new Error(`Could not find sub-command name in content field.`);
            }
            params.content = params.content.substring(subNameIndex).trimLeft();

            const subCommand = this.subCommandMap.get(subName);
            if (Validation.validate(params, subCommand, params.src.member)) {
                await subCommand.executeChat(params);
            }
        }
        else {
            throw new Error(`Invalid sub-command for command \`${this.name}\`.`);
        }
    }

    // Delegates a slash command to a sub-command
    public async runSlash(params: SlashCommandParameters) {
        const subCommandOption = params.options.find(option => 
            DiscordUtil.ApplicationCommandOptionTypeConverter[option.type]
            === ApplicationCommandOptionType.SUB_COMMAND
        );
        if (!subCommandOption) {
            throw new Error(`Missing sub-command for command \`${this.name}\`.`);
        }

        if (this.subCommandMap.has(subCommandOption.name)) {
            params.options.delete(subCommandOption.name);

            const subCommand = this.subCommandMap.get(subCommandOption.name);
            if (Validation.validate(params, subCommand, params.src.member)) {
                await subCommand.executeSlash(params);
            }
        }
        else {
            throw new Error(`Invalid sub-command for command \`${this.name}\`.`);
        }
    }
}