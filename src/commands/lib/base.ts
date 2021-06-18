import { ApplicationCommandOptionType } from 'discord-api-types';
import { ApplicationCommandData, ApplicationCommandOption, ApplicationCommandOptionChoice, ApplicationCommandOptionData, Collection, CommandInteractionOption, MessageEmbed, Snowflake } from 'discord.js';
import { DiscordBot } from '../../bot';
import { GuildAttributes } from '../../data/model/guild';
import { DiscordUtil } from '../../util/discord';
import { CommandSource } from '../../util/command-source';
import { ExpireAge, ExpireAgeFormat, TimedCache } from '../../util/timed-cache';
import { Validation } from '../../events/util/validate';

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

export enum CommandPermission {
    Owner,
    Administrator,
    Everyone,
}

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

export interface SingleArgumentConfig {
    description: string;
    type: ArgumentType;
    required: boolean;
    choices?: ApplicationCommandOptionChoice[];
}

// Disable these types, as they are unneeded for this bot
export type RestrictedCommandOptionType = Exclude<
    ApplicationCommandOptionType,
    ApplicationCommandOptionType.SUB_COMMAND | ApplicationCommandOptionType.SUB_COMMAND_GROUP | ApplicationCommandOptionType.MENTIONABLE
>;

// Parameters given to all commands
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

const StandardCooldownObject = {
    Low: { seconds: 3 },
    Medium: { seconds: 5 },
    High: { seconds: 10 },
    Minute: { minutes: 1 },
} as const;

export const StandardCooldowns: Readonly<Record<keyof typeof StandardCooldownObject, Readonly<ExpireAgeFormat>>> = StandardCooldownObject;

export type CommandTypeArray = Array<{ new(): BaseCommand }>;
export type CommandMap<K> = Map<K, BaseCommand>;

// Optional fields for command handlers
export interface BaseCommand {
    readonly prefix?: string;
    readonly moreDescription?: string | string[];
    readonly cooldown?: ExpireAge;
    readonly examples?: string[];
    readonly disableInCustomCommand?: boolean;
    readonly disableSlash?: boolean;
    readonly slashGuildId?: Snowflake;
    readonly isNested?: boolean;
    readonly subCommands?: CommandMap<string>;

    // Add any additional fields to the help message
    addHelpFields?(embed: MessageEmbed): void;
}

// A single command handler
// Do not inherit directly from this!
export abstract class BaseCommand {
    public abstract readonly name: string;
    public abstract readonly description: string;
    public abstract readonly category: CommandCategory;
    public abstract readonly permission: CommandPermission;

    public abstract readonly args?: ReadonlyDictionary<SingleArgumentConfig>;

    private cooldownSet: TimedCache<string, number> = null;

    public get isSlashCommand(): boolean {
        // Command must be public
        return !this.disableSlash && this.permission === CommandPermission.Everyone && this.category !== CommandCategory.Secret;
    }

    public fullDescription(): string {
        if (!this.moreDescription) {
            return this.description;
        }
        if (Array.isArray(this.moreDescription)) {
            return this.description + '\n\n' + this.moreDescription.join('\n\n');
        }
        return this.description + '\n\n' + this.moreDescription;
    }

    // Generates symbolic form of command arguments
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

    public async executeChat(params: ChatCommandParameters): Promise<void> {
        if (await params.bot.handleCooldown(params.src, this.cooldownSet)) {
            return this.runChat(params);
        }
    }

    public async executeSlash(params: SlashCommandParameters): Promise<void> {
        if (await params.bot.handleCooldown(params.src, this.cooldownSet)) {
            return this.runSlash(params);
        }
    }
}

// Command handler that takes no arguments
export abstract class SimpleCommand extends BaseCommand {
    public args = null;
    public isNested: false = false;

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

export type ArgumentsConfig<T> = { readonly [key in keyof T]-?: SingleArgumentConfig };

// Command handler that takes one or more arguments
abstract class ParameterizedCommand<T extends object> extends BaseCommand {
    public abstract readonly args?: ArgumentsConfig<T>;

    public abstract run(params: CommandParameters, args: T): Promise<void>;

    private static convertArgumentType(type: ArgumentType): ApplicationCommandOptionType {
        switch (type) {
            case ArgumentType.RestOfContent: return ApplicationCommandOptionType.STRING;
            default: return type as number as ApplicationCommandOptionType;
        }
    }

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

    public async runSlash(params: SlashCommandParameters): Promise<void> {
        // No parsing needed for slash commands
        // Discord has already done it for us!
        // Just pick the right part of the option object depending on the type
        const parsedOptions: T = params.options.reduce((obj, option) => {
            const next = { ...obj };
            switch (DiscordUtil.ApplicationCommandOptionTypeConverter[option.type]) {
                case ApplicationCommandOptionType.USER: next[option.name] = option.member; break;
                case ApplicationCommandOptionType.CHANNEL: next[option.name] = option.channel; break;
                case ApplicationCommandOptionType.ROLE: next[option.name] = option.role; break;
                default: next[option.name] = option.value;
            }
            return next;
        }, { } as T);
        return this.run(params, parsedOptions);
    }
}

export interface ComplexCommand<T extends object> {
    // Suppresses chat arguments parsing errors, allowing the command to run anyway
    // Input validation should be done in the command handler, then
    readonly suppressChatArgumentsError?: boolean;
}

// Command handler that automatically parses chat and slash arguments the same way
export abstract class ComplexCommand<T extends object> extends ParameterizedCommand<T> {
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

    public async runChat(params: ChatCommandParameters): Promise<void> {
        // Parse message according to arguments configuration
        // This allows chat commands to behave almost exactly like slash commands
        // However, there are a few limitations:
            // Chat arguments are separated by space, while slash arguments are separated by the client
            // Chat arguments must be listed sequentially, while slash arguments can be out of order
                // This allows later optional arguments to be defined while others are not
                // Commands should consider this a possibility now
                // Later optional commands cannot entirely depend on the presence of previous optional commands
        const parsed: Partial<T> = { };
        let i = 0;
        for (const entry of Object.entries(this.args)) {
            // arg is really of type "keyof T"
            const [arg, data] = entry as [string, SingleArgumentConfig];
            let nextArg = params.args[i];
            
            if (i >= params.args.length) {
                if (data.required) {
                    if (!this.suppressChatArgumentsError) {
                        throw new Error(`Missing required argument \`${arg}\``);
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
                            throw new Error(`Invalid value \`${nextArg}\` for argument \`${arg}\``);
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
                        throw new Error(`Invalid boolean value \`${nextArg}\` for argument \`${arg}\``);
                    }
                } break;
                case ArgumentType.Integer: {
                    if (data.choices) {
                        const choice = data.choices.find(choice => DiscordUtil.accentStringEqual(choice.name, nextArg));
                        if (choice === undefined && !this.suppressChatArgumentsError) {
                            throw new Error(`Invalid value \`${nextArg}\` for argument \`${arg}\``);
                        }
                        parsed[arg] = choice.value;
                    }                    
                    else {
                        const num = parseInt(nextArg);
                        if (isNaN(num) && !this.suppressChatArgumentsError) {
                            throw new Error(`Invalid integer value \`${nextArg}\` for argument \`${arg}\``);
                        }
                        parsed[arg] = num;
                    }
                } break;
                case ArgumentType.Channel: {
                    const channel = params.bot.getChannelFromString(nextArg, params.guild.id);
                    if (!channel && !this.suppressChatArgumentsError) {
                        throw new Error(`Invalid channel \`${nextArg}\` for argument \`${arg}\``);
                    }
                    parsed[arg] = channel;
                } break;
                case ArgumentType.Role: {
                    const role = params.bot.getRoleFromString(nextArg, params.guild.id);
                    if (!role && !this.suppressChatArgumentsError) {
                        throw new Error(`Invalid role \`${nextArg}\` for argument \`${arg}\``);
                    }
                    parsed[arg] = role;
                } break;
                case ArgumentType.User: {
                    const member = await params.bot.getMemberFromString(nextArg, params.guild.id);
                    if (!member && !this.suppressChatArgumentsError) {
                        throw new Error(`Invalid guild member \`${nextArg}\` for argument \`${arg}\``);
                    }
                    parsed[arg] = member;
                } break;
            }
            ++i;
        }
        return this.run(params, parsed as T);
    }
}

// Command handler that implements its own parsing within the command itself
// Some commands have very complex parsing methods, which make slash commands impractical
// Thus, legacy commands allow chat-only commands to be expressed without having to set up an arguments object
// The lib/fun/screenshot command is a good example of this
export abstract class LegacyCommand<T extends object> extends ParameterizedCommand<T> {
    public isNested: false = false;

    protected abstract parseChatArgs(params: ChatCommandParameters): T;

    public async runChat(params: ChatCommandParameters) {
        return this.run(params, this.parseChatArgs(params));
    }
}

// Command that delegates to sub-commands
export abstract class NestedCommand extends BaseCommand {
    public args = null;
    public isNested: true = true;

    public subCommands: CommandMap<string>;
    public abstract subCommandConfig: CommandTypeArray;

    public argsString() {
        return `(${[...this.subCommands.keys()].join(' | ')})`;
    }

    public initialize() {
        super.initialize();

        if (this.subCommandConfig.length === 0) {
            this.throwConfigurationError(`Sub-command array cannot be empty.`); 
        }
        if (this.subCommandConfig.length > 25) {
            this.throwConfigurationError(`Command can only have up to 25 sub-commands.`);
        }

        this.subCommands = new Map();
        for (const cmd of this.subCommandConfig) {
            const instance = new cmd();
            instance.initialize();

            if (instance.isNested) {
                this.throwConfigurationError(`Sub-command ${instance.name} is nested, but commands only support 1 level of nesting.`);
            }

            this.subCommands.set(instance.name, instance);
        }
    }

    public commandData(): ApplicationCommandData {
        const data = { } as ApplicationCommandData;

        data.name = this.name;
        data.description = this.description;
        data.defaultPermission = this.permission === CommandPermission.Everyone;
        data.options = [];

        for (const [key, cmd] of [...this.subCommands.entries()]) {
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
        embed.addField('Sub-Commands', [...this.subCommands.keys()].map(key => `\`${key}\``).join(', '));
    }

    public async runChat(params: ChatCommandParameters) {
        if (params.args.length === 0) {
            throw new Error(`Missing sub-command for command \`${this.name}\``);
        }

        const subName = params.args.shift();

        if (this.subCommands.has(subName)) {
            const subNameIndex = params.content.indexOf(subName);
            if (subNameIndex === -1) {
                throw new Error(`Could not find sub-command name in content field`);
            }
            params.content = params.content.substring(subNameIndex).trimLeft();

            const subCommand = this.subCommands.get(subName);
            if (Validation.validate(params, subCommand, params.src.member)) {
                await subCommand.executeChat(params);
            }
        }
        else {
            throw new Error(`Invalid sub-command for command \`${this.name}\``);
        }
    }

    public async runSlash(params: SlashCommandParameters) {
        const subCommandOption = params.options.find(option => 
            DiscordUtil.ApplicationCommandOptionTypeConverter[option.type]
            === ApplicationCommandOptionType.SUB_COMMAND
        );
        if (!subCommandOption) {
            throw new Error(`Missing sub-command for command \`${this.name}\``);
        }

        if (this.subCommands.has(subCommandOption.name)) {
            params.options.delete(subCommandOption.name);

            const subCommand = this.subCommands.get(subCommandOption.name);
            if (Validation.validate(params, subCommand, params.src.member)) {
                await subCommand.executeSlash(params);
            }
        }
        else {
            throw new Error(`Invalid sub-command for command \`${this.name}\``);
        }
    }
}