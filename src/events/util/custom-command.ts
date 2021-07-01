import { User, GuildMember, Guild, Channel, Snowflake, MessageAttachment } from 'discord.js';
import { CommandParameters } from '../../commands/lib/base';
import { Validation } from './validate';
import { DataService } from '../../data/data-service';
import *  as mathjs from 'mathjs';
import { ExpireAge, ExpireAgeFormat, TimedCache } from '../../util/timed-cache';
import { CustomCommandData, CustomCommandFlag } from '../../data/model/custom-command';
import { EmbedTemplates } from '../../util/embed';

export interface CustomCommandEngineOptions {
    universal?: boolean;
    silent?: boolean;
}

// Result from parsing a portion of custom command code
interface ResponseParseResult {
    // The result of the parse
    response: string;
    // The next index to start parsing at
    index: number;
}

interface VariableRuntimeData {
    name: string;
    isSubscripted: boolean;
    begin: number;
    end: number;
}

// Support metadata functions
export enum CustomCommandMetadata {
    Description = 'description',
    ContentName = 'content-name',
    ContentDescription = 'content-description',
    NoContent = 'no-content',
    NoSlash = 'no-slash',
    ContentRequired = 'content-required',
}

// Result from parsing all metadata from custom command code
interface ParseMetadataResult {
    // Parsed code, with no metadata
    code: string;
    // Metadata values
    values: Map<CustomCommandMetadata, string | boolean>;
}

// Special characters within custom command code
enum SpecialChars {
    FunctionBegin = '{',
    FunctionEnd = '}',
    VarBegin = '$',
    MetadataBegin = '%',
    VarAssign = '=',
    FunctionAssign = ':=',
    AttributeSeparator = '.',
    ListSeparator = ';',
    SubscriptBegin = '[',
    SubscriptEnd = ']',
    SubscriptRange = '-',
}

enum ExecutionLimit {
    Message = 'message',
    Command = 'command',
    Wait = 'wait',
    Repeat = 'repeat',
    API = 'api',
}

type LimitsDictionary = { readonly [limit in ExecutionLimit]: number };

export class CustomCommandEngine {
    private static readonly undefinedVar = 'undefined';
    private static readonly trueVar = 'true';
    private static readonly falseVar = 'false';
    private static readonly nonVarChar = /[^a-zA-Z\d_!?\$%>\+\-\[\]]/;
    private static readonly whitespaceRegex = /\s/;
    private static readonly maxParseDepth = 32;

    private static readonly specialVars = {
        allArguments: 'ALL',
        argCount: 'COUNT',
        loopCounter: 'i',
        regexMatchGroup: 'match-group-',
        regexMatchBegin: 'match-begin',
        regexMatchEnd: 'match-end',
        functionArgument: 'arg-',
    } as const;

    private static readonly defaultLimits: ReadonlyDictionary<LimitsDictionary> = {
        normal: {
            repeat: 64,
            wait: 10000,
            message: 5,
            command: 10,
            api: 3,
        },
        universal: {
            repeat: 64,
            wait: 0,
            message: 0,
            command: 0,
            api: 1,
        },
    }

    private static readonly comparisonOperators = /\s*(==|!?~?=|[<>]=?)\s*/g;
    private static readonly regexRegex = /^\/([^\/\\]*(?:\\.[^\/\\]*)*)\/([gimsuy]*)(?: ((?:.|\n)*))?$/;

    public static readonly cooldownTime: ExpireAgeFormat = { seconds: 3 };
    private static readonly cooldownSet: TimedCache<string, number> = new TimedCache(CustomCommandEngine.cooldownTime);

    public static readonly universalCooldown: ExpireAge = { minutes: 5 };
    private static readonly universalCooldownSet: TimedCache<string, number> = new TimedCache(CustomCommandEngine.universalCooldown);

    private content: string;
    private args: string[];
    private options: CustomCommandEngineOptions;

    constructor(private params: CommandParameters, content?: string, args?: string[], options: CustomCommandEngineOptions = { }) {
        this.content = content || '';
        this.args = args ? args : content ? params.bot.splitIntoArgs(content) : [];

        this.options = options;
        if (options.universal) {
            this.limits = CustomCommandEngine.defaultLimits.universal;
        }
        else {
            this.limits = CustomCommandEngine.defaultLimits.normal;
        }
    }

    private static readonly userParams: ReadonlyDictionary<(user: User) => string> = {
        name: user => user.username,
        id: user => user.id,
        tag: user => user.tag,
        discriminator: user => user.discriminator,
        status: user => user.presence.status,
        avatar: user => user.avatar,
        mention: user => user.toString(),
        createdAt: user => user.createdAt.toLocaleDateString(),
    };

    private static readonly memberParams: ReadonlyDictionary<(member: GuildMember) => string> = {
        nickname: member => member.displayName,
        joinedAt: member => member.joinedAt.toLocaleDateString(),
    };

    private static readonly guildParams: ReadonlyDictionary<(guild: Guild) => string> = {
        id: guild => guild.id,
        name: guild => guild.name,
        icon: guild => guild.iconURL() || CustomCommandEngine.undefinedVar,
        memberCount: guild => guild.memberCount.toString(),
        ownerId: guild => guild.ownerID,
        createdAt: guild => guild.createdAt.toLocaleDateString(),
        region: guild => guild.preferredLocale,
    };

    private static readonly channelParams: ReadonlyDictionary<(channel: Channel) => string> = {
        id: channel => channel.id,
        name: channel => (channel as any).name || CustomCommandEngine.undefinedVar,
        mention: channel => channel.toString(),
    };

    // Functions that use lazy evaluation
    private static readonly lazyEvalFunctions: Set<string> = new Set([
        'quote',
        'function',
    ]);

    // Functions that use lazy evaluation to select one option from many
    private static readonly selectorFunctions: Set<string> = new Set([
        'choose',
        'if',
        'repeat',
        'call',
    ]);

    public static readonly AllOptions: ReadonlyDictionary<ReadonlyArray<string>> = {
        'Runtime Arguments': [
            '$N',
            `\$${CustomCommandEngine.specialVars.allArguments}`,
            `\$${CustomCommandEngine.specialVars.argCount}`,
            `\$${CustomCommandEngine.specialVars.loopCounter} (in repeat)`,
            `\$${CustomCommandEngine.specialVars.regexMatchBegin} (after regex)`,
            `\$${CustomCommandEngine.specialVars.regexMatchEnd} (after regex)`,
            `\$${CustomCommandEngine.specialVars.regexMatchGroup}N (after regex)`,
            `\$${CustomCommandEngine.specialVars.functionArgument}N (in function call)`,
        ],
        'Metadata': [
            ...Object.keys(CustomCommandMetadata).map(key => `{%${CustomCommandMetadata[key]} value}`),
        ],
        'User Variables': [
            '{user}',
            ...Object.keys(CustomCommandEngine.userParams).map(key => `{user.${key}}`),
            ...Object.keys(CustomCommandEngine.memberParams).map(key => `{user.${key}}`),
        ],
        'Server Variables': [
            '{server}',
            ...Object.keys(CustomCommandEngine.guildParams).map(key => `{server.${key}}`),
        ],
        'Channel Variables': [
            '{channel}',
            ...Object.keys(CustomCommandEngine.channelParams).map(key => `{channel.${key}}`),
        ],
        'Other Variables': [
            `$var`,
            `{$var}`,
            `{$var = value}`,
            `{$var = {function}}`,
            `{$var = $1 or $var2 or ...}`,
            `{time}`,
            `{date}`,
            `{prefix}`,
        ],
        'Functions': [
            `{>command arg1 arg2 ...}`,
            `{message msg}`,
            `{embed msg}`,
            `{regex /pattern/ string}`,
            `{capitalize string}`,
            `{lowercase string}`,
            `{uppercase string}`,
            `{substring start string}`,
            `{length string}`,
            `{not boolean}`,
            `{undefined? var}`,
            `{empty? string}`,
            `{random a b}`,
            `{random-member}`,
            `{math expression}`,
            `{nickname name}`,
            `{role name}`,
            `{+role name}`,
            `{-role name}`,
            `{role? name}`,
            `{wait ms}`,
            `{silent}`,
            `{delete}`,
        ],
        'Selectors': [
            `{choose item1;item2;...}`,
            `{if val1 [=|!=|<|>|<=|>=|~=|!~=] val2 [and|or] val3 [op] val4;then;else}`,
            `{if val1 [op] val2 [op] val3 ...;then;else}`,
            `{repeat n;code1;code2;...}`,
        ],
        'Indexing': [
            `$var[0]`,
            `$var[0-5]`,
            `{$var[2-4] = value}`,
        ],
        'Programming:': [
            `{quote text}`,
            `{$function-name := {function code}}`,
            `{eval code}`,
            `{eval $function-name}`,
            `{call $function-name;arg1;arg2}`,
        ],
    };

    private vars: Map<string, string> = new Map();
    private arguments: string[] = [];
    private stack: Array<string[]> = [];
    private depth: number = 0;
    private memberContext: GuildMember = null;
    private readonly limits: LimitsDictionary;
    private limitProgress: Partial<Writeable<LimitsDictionary>> = { };
    
    // Parses all metadata out of the custom command code
    public static parseMetadata(code: string): ParseMetadataResult {
        const result: Partial<ParseMetadataResult> = { values: new Map() };
        let i = 0;
        while ((i = code.indexOf(SpecialChars.MetadataBegin, i)) !== -1) {
            if (code.charAt(i - 1) === SpecialChars.FunctionBegin) {
                // Metadata starts at index (i - 1)
                // We need to find where it ends
                const nameStart = i + 1;
                const nameEnd = nameStart + code.substring(nameStart).search(CustomCommandEngine.nonVarChar);

                let value: string | boolean;
                let metadataEnd: number;
                // No value at all, no parsing required
                if (code.charAt(nameEnd) === SpecialChars.FunctionEnd) {
                    value = true;
                    metadataEnd = nameEnd + 1;
                }
                // There is some value data after the metadata tag, parse it
                else {
                    const response = CustomCommandEngine.parseLazyEvalCode(code, nameEnd);
                    value = response.response.trim();
                    metadataEnd = response.index;
                }

                result.values.set(code.substring(nameStart, nameEnd) as CustomCommandMetadata, value);
                code = code.substring(0, i - 1) + code.substring(metadataEnd);
                // Do not update i, because the whole metadata portion was removed
                // We begin searching for the next metadata at the same index!
            }
        }
        result.code = code.trim();
        return result as ParseMetadataResult;
    }

    private static makeMetadataFunction(name: string, value?: string): string {
        return `{${SpecialChars.MetadataBegin}${name}${value ? ` ${value}` : ''}}`;
    }

    public static addMetadata(data: CustomCommandData): string {
        const code = [
            CustomCommandEngine.makeMetadataFunction(CustomCommandMetadata.Description, data.description),
        ];

        if (data.flags & CustomCommandFlag.DisableSlash) {
            code.push(CustomCommandEngine.makeMetadataFunction(CustomCommandMetadata.NoSlash));
        }
        else {
            if (data.flags & CustomCommandFlag.NoContent) {
                code.push(CustomCommandEngine.makeMetadataFunction(CustomCommandMetadata.NoContent));
            }
            else {
                if (data.flags & CustomCommandFlag.ContentRequired) {
                    code.push(CustomCommandEngine.makeMetadataFunction(CustomCommandMetadata.ContentRequired));
                }
                code.push(CustomCommandEngine.makeMetadataFunction(CustomCommandMetadata.ContentName, data.contentName));
                code.push(CustomCommandEngine.makeMetadataFunction(CustomCommandMetadata.ContentDescription, data.contentDescription));
            }
        }

        code.push(data.message);
        return code.join(' ');
    }

    private assertLimit(name: ExecutionLimit, increase: number) {
        if (this.limitProgress[name] === undefined) {
            this.limitProgress[name] = 0;
        }
        if (increase + this.limitProgress[name] > this.limits[name]) {
            throw new Error(`${name[0].toUpperCase()}${name.substr(1)} limit (${this.limits[name]}) exceeded.`);
        }
        this.limitProgress[name] += increase;
    }

    private checkLimitProgress(name: ExecutionLimit) {
        if (!this.limitProgress[name]) {
            this.limitProgress[name] = 0;
        }
        return this.limitProgress[name];
    }

    private handleVariableNative(name: string): string | undefined {
        if (/^\d+$/.test(name)) {
            const argIndex = parseInt(name);
            return !isNaN(argIndex) ? this.args[argIndex - 1] : undefined;
        }
        else if (name === CustomCommandEngine.specialVars.allArguments) {
            return this.content;
        }
        else if (name === CustomCommandEngine.specialVars.argCount) {
            return this.args.length.toString();
        }
        else if (name.startsWith(CustomCommandEngine.specialVars.functionArgument)) {
            const argNum = parseInt(name.substr(CustomCommandEngine.specialVars.functionArgument.length));
            if (isNaN(argNum) || argNum < 1 || argNum > this.arguments.length) {
                return CustomCommandEngine.undefinedVar;
            }
            return this.arguments[argNum - 1];
        }
        return this.vars.get(name);
    }

    private parseRuntimeData(name: string): VariableRuntimeData {
        const result: VariableRuntimeData = {
            name,
            isSubscripted: false,
            begin: 0,
            end: 0,
        };

        if (name.endsWith(SpecialChars.SubscriptEnd)) {
            const subscriptBegin = name.indexOf(SpecialChars.SubscriptBegin);
            if (subscriptBegin !== -1) {
                const fullSubscriptRange = name.slice(subscriptBegin + 1, name.length - 1);
                result.name = name.slice(0, subscriptBegin);
                const indices = fullSubscriptRange.split(SpecialChars.SubscriptRange);

                let invalid = false;
                if (indices.length === 1) {
                    result.begin = parseInt(indices[0]);
                    result.end = result.begin + 1;
                    invalid = isNaN(result.begin);
                }
                else if (indices.length === 2) {
                    result.begin = parseInt(indices[0]);
                    result.end = parseInt(indices[1]);
                    invalid = isNaN(result.begin) || isNaN(result.end);
                }
                else {
                    invalid = true;
                }

                if (invalid) {
                    throw new Error(`Invalid subscript notation \`${SpecialChars.SubscriptBegin}${fullSubscriptRange}${SpecialChars.SubscriptEnd}\` attached to variable \`${SpecialChars.VarBegin}${name}\`.`);
                }
                
                result.isSubscripted = true;
            }
        }

        return result;
    }

    private handleVariable(name: string): string {
        const varData = this.parseRuntimeData(name);

        const value = this.handleVariableNative(varData.name);
        if (value === undefined || value === null) {
            return CustomCommandEngine.undefinedVar;
        }
        else if (varData.isSubscripted) {
            return value.slice(varData.begin, varData.end) ?? CustomCommandEngine.undefinedVar;
        }
        else {
            return value;
        }
    }

    private setVariable(name: string, value: string) {
        const varData = this.parseRuntimeData(name);

        let newValue: string = undefined;
        if (varData.isSubscripted) {
            const oldValue = this.handleVariableNative(varData.name);
            if (oldValue) {
                newValue = oldValue.slice(0, varData.begin) 
                    + value
                    + oldValue.slice(varData.end);
            }
        }
        else {
            newValue = value;
        }

        if (newValue !== undefined) {
            this.vars.set(varData.name, newValue);
        }
    }

    private async handleFunction(name: string, args: string): Promise<string | null> {
        // Variable function
        if (name.startsWith(SpecialChars.VarBegin)) {
            const varName = name.substr(1);

            // Assignment
            if (args.startsWith(SpecialChars.VarAssign)) {
                const rightSide = args.substr(SpecialChars.VarAssign.length);
                const potentialValues = rightSide.split(/\s+or\s+/).map(val => val.trim());
                if (potentialValues.length > 1) {
                    // Pick first non-undefined value
                    let i = 0; 
                    for (i; i < potentialValues.length - 1; ++i) {
                        const potential = potentialValues[i];
                        if (potential.length !== 0 && potential !== CustomCommandEngine.undefinedVar) {
                            break;
                        }
                    }
                    this.setVariable(varName, potentialValues[i]);
                }
                else {
                    this.setVariable(varName, rightSide.trimLeft());
                }
                return '';
            }
            // Function assignment, which means no null coalescing
            if (args.startsWith(SpecialChars.FunctionAssign)) {
                const rightSide = args.substr(SpecialChars.FunctionAssign.length);
                this.setVariable(varName, rightSide.trim());
                return '';
            }
            // Text replacement
            else if (!args) {
                return this.handleVariable(varName);
            }
            // Error
            else {
                return null;
            }
        }
        // Ignore metadata
        else if (name.startsWith(SpecialChars.MetadataBegin)) {
            return '';
        }
        // Nested command call
        else if (name.startsWith(DataService.defaultPrefix)) {
            this.assertLimit(ExecutionLimit.Command, 1);
            const cmd = name.substr(1);
            if (this.params.bot.commands.has(cmd)) {
                const command = this.params.bot.commands.get(cmd);
                if (!command.disableInCustomCommand && Validation.validate(this.params, command, this.memberContext)) {
                    args = args.trim();
                    if (args === CustomCommandEngine.undefinedVar) {
                        args = '';
                    }
                    await command.executeChat({
                        bot: this.params.bot,
                        src: this.params.src,
                        guild: this.params.guild,
                        content: args,
                        args: args ? this.params.bot.splitIntoArgs(args) : [],
                    });
                }
            }
            return '';
        }
        // Some other built-in function
        else {
            switch (name) {
                case 'time': {
                    return new Date().toLocaleTimeString();
                } break;
                case 'date': {
                    return new Date().toLocaleDateString();
                } break;
                case 'prefix': {
                    return this.params.guild.prefix;
                } break;
                case 'silent': {
                    this.options.silent = true;
                    return '';
                } break;
                case 'delete': {
                    if (this.params.src.deletable) {
                        await this.params.src.delete();
                    }
                    return '';
                } break;
                case 'quote':
                case 'function': {
                    return args;
                } break;
                case 'eval': {
                    return this.parse(args);
                } break;
                case 'not': {
                    if (!args || args === CustomCommandEngine.falseVar || args === CustomCommandEngine.undefinedVar) {
                        return CustomCommandEngine.trueVar;
                    }
                    return CustomCommandEngine.falseVar;
                } break;
                case 'undefined?': {
                    return args === CustomCommandEngine.undefinedVar ? CustomCommandEngine.trueVar : CustomCommandEngine.falseVar;
                } break;
                case 'empty?': {
                    return args.length === 0 ? CustomCommandEngine.trueVar : CustomCommandEngine.falseVar;
                } break;
                case 'wait': {
                    const ms = parseInt(args);
                    if (isNaN(ms) || ms < 0) {
                        throw new Error('Invalid value for wait.');
                    }
                    this.assertLimit(ExecutionLimit.Wait, ms);
                    await this.params.bot.wait(ms);
                    return '';
                } break;
                case 'message': {
                    this.assertLimit(ExecutionLimit.Message, 1);
                    await this.params.src.send(args);
                    return '';
                } break;
                case 'embed': {
                    this.assertLimit(ExecutionLimit.Message, 1);
                    const embed = this.params.bot.createEmbed();
                    embed.setDescription(args);
                    await this.params.src.send({ embeds: [embed] });
                    return '';
                } break;
                case 'random':
                case 'rand': {
                    const nums = args.split(/\s+/);
                    let low = 0;
                    let high = 10;
                    if (nums.length === 1) {
                        high = parseInt(nums[0]);
                    }
                    else if (nums.length > 1) {
                        low = parseInt(nums[0]);
                        high = parseInt(nums[1]);
                    }

                    if (low > high) {
                        let temp = low;
                        low = high;
                        high = temp;
                    }

                    // Error
                    if (isNaN(high) || isNaN(low)) {
                        return CustomCommandEngine.undefinedVar;
                    }
                    return Math.floor((Math.random() * (high - low + 1) + low)).toString();
                } break;
                case 'random-member': {
                    const memberList = await this.params.bot.memberListService.getMemberListForGuild(this.params.guild.id);
                    return memberList.random().user.username;
                } break;
                case 'math': {
                    return mathjs.evaluate(args);
                } break;
                case 'capitalize': {
                    return args[0].toUpperCase() + args.substr(1);
                } break;
                case 'lowercase': {
                    return args.toLowerCase();
                } break;
                case 'uppercase': {
                    return args.toUpperCase();
                } break;
                case 'substring': {
                    const whitespace = args.match(/\s+/);
                    let startIndex = parseInt(args.substr(0, whitespace.index));
                    const str = args.substr(whitespace.index + whitespace.length);
                    if (isNaN(startIndex)) {
                        throw new Error('Invalid value for substring.');
                    }
                    if (startIndex < 0) {
                        startIndex += str.length;
                    }
                    return str.substr(startIndex);
                } break;
                case 'length': {
                    return args.length.toString();
                } break;
                case 'regex': {
                    const match = args.match(CustomCommandEngine.regexRegex);
                    if (match) {
                        const regex = new RegExp(match[1], match[2]);
                        if (!match[3]) {
                            return CustomCommandEngine.falseVar;
                        }
                        const results = regex.exec(match[3]);
                        if (!results) {
                            return CustomCommandEngine.falseVar;
                        }
                        else {
                            // Set special regex variables
                            this.vars.set(CustomCommandEngine.specialVars.regexMatchBegin, results.index.toString());
                            this.vars.set(CustomCommandEngine.specialVars.regexMatchEnd, (results.index + results[0].length).toString());
                            for (let i = 0; i < results.length; ++i) {
                                if (results[i]) {
                                    this.vars.set(CustomCommandEngine.specialVars.regexMatchGroup + i.toString(), results[i]);
                                }
                            }
                            return CustomCommandEngine.trueVar;
                        }
                    }
                    return null;
                } break;
                case 'nickname': {
                    this.assertLimit(ExecutionLimit.API, 1);
                    this.memberContext = await this.memberContext.setNickname(args);
                    return '';
                } break;
                case 'role': {
                    const role = this.params.bot.getRoleFromString(args, this.params.guild.id);
                    if (!role) {
                        throw new Error(`Role "${args}" could not be found.`);
                    }

                    this.assertLimit(ExecutionLimit.API, 1);
                    const memberRoles = this.memberContext.roles;
                    if (memberRoles.cache.has(role.id)) {
                        this.memberContext = await memberRoles.remove(role);
                    }
                    else {
                        this.memberContext = await memberRoles.add(role)
                    }
                    return '';
                } break;
                case 'role?': {
                    const role = this.params.bot.getRoleFromString(args, this.params.guild.id);
                    if (!role) {
                        throw new Error(`Role "${args}" could not be found.`);
                    }

                    return this.memberContext.roles.cache.has(role.id) ? CustomCommandEngine.trueVar : CustomCommandEngine.falseVar;
                } break;
                case '+role': {
                    const role = this.params.bot.getRoleFromString(args, this.params.guild.id);
                    if (!role) {
                        throw new Error(`Role "${args}" could not be found.`);
                    }

                    this.assertLimit(ExecutionLimit.API, 1);
                    this.memberContext = await this.memberContext.roles.add(role);
                    return '';
                } break;
                case '-role': {
                    const role = this.params.bot.getRoleFromString(args, this.params.guild.id);
                    if (!role) {
                        throw new Error(`Role "${args}" could not be found.`);
                    }

                    this.assertLimit(ExecutionLimit.API, 1);
                    this.memberContext = await this.memberContext.roles.remove(role);
                    return '';
                } break;
                case 'user': {
                    if (args.startsWith(SpecialChars.AttributeSeparator)) {
                        const attr = args.substr(1);
                        if (CustomCommandEngine.userParams[attr]) {
                            return CustomCommandEngine.userParams[attr](this.memberContext.user);
                        }
                        else if (CustomCommandEngine.memberParams[attr]) {
                            return CustomCommandEngine.memberParams[attr](this.memberContext);
                        }
                        return null;
                    }
                    else {
                        return this.memberContext.user.toString();
                    }
                } break;
                case 'guild':
                case 'server': {
                    if (args.startsWith(SpecialChars.AttributeSeparator)) {
                        const attr = args.substr(1);
                        if (CustomCommandEngine.guildParams[attr]) {
                            return CustomCommandEngine.guildParams[attr](this.params.src.guild);
                        }
                        return null;
                    }
                    else {
                        return this.params.src.guild.toString();
                    }
                } break;
                case 'channel': {
                    if (args.startsWith(SpecialChars.AttributeSeparator)) {
                        const attr = args.substr(1);
                        if (CustomCommandEngine.channelParams[attr]) {
                            return CustomCommandEngine.channelParams[attr](this.params.src.channel);
                        }
                        return null;
                    }
                    else {
                        return this.params.src.channel.toString();
                    }
                } break;
                // This is not a function
                default: {
                    return null;
                } break;
            }
        }
    }

    // Selector functions select an option, then evaluate it using another parse
    private async handleSelectorFunction(name: string, args: string[]): Promise<string | null> {
        switch (name) {
            case 'choose': {
                if (args.length === 0) {
                    return '';
                }
                // Evaluate the choice
                return this.parse(args[Math.floor(Math.random() * args.length)]);
            } break;
            case 'if': {
                let [wholeCondition, then, other] = args;
                if (wholeCondition === undefined || then === undefined) {
                    return null;
                }

                // Evaluate condition
                wholeCondition = await this.parse(wholeCondition);

                // Parse condition by logical separators
                let separators = [...wholeCondition.matchAll(/\s+(and|or)\s+/g)];
               
                // The global result of the function
                let globalResult = true;

                // Start at -1, because separators are not required
                for (let i = -1; i < separators.length; ++i) {
                    // Get the current separator and condition
                    const separator: string | undefined = separators[i]?.[1];
                    const condition = wholeCondition.substring(
                        separators[i] ? separators[i].index + separators[i][0].length : 0,
                        separators[i + 1] ? separators[i + 1].index : undefined
                    );

                    // Number of operators to evaluate
                    const conditions = [...condition.matchAll(CustomCommandEngine.comparisonOperators)];
                    
                    // Result of the nested condition
                    let localResult = true;

                    // No operators, just a single value
                    if (conditions.length == 0) {
                        localResult = condition === CustomCommandEngine.trueVar;
                    }
                    // Perform operations
                    else {
                        for (let j = 0; j < conditions.length; ++j) {
                            // A single condition may be chained, such as 0 < $val < 10
                            const operator = conditions[j][1];
                            const nested = condition.substring(
                                conditions[j - 1] ? conditions[j - 1].index + conditions[j - 1][0].length : 0, 
                                conditions[j + 1] ? conditions[j + 1].index : undefined
                            );
                            const values = nested.split(conditions[j][0]);

                            // Use number comparison if both strings can be parsed as integers
                            // If not, use string comparison
                            let a: number | string, b: number | string;
                            [a, b] = values;
                            const num1 = parseInt(a);
                            const num2 = parseInt(b);
                            if (!isNaN(num1) && !isNaN(num2)) {
                                a = num1;
                                b = num2;
                            }
                            switch (operator) {
                                case '=':
                                case '==':
                                    localResult = localResult && a === b;
                                    break;
                                case '!=':
                                    localResult = localResult && a != b;
                                    break;
                                case '<':
                                    localResult = localResult && a < b;
                                    break;
                                case '>':
                                    localResult = localResult && a > b;
                                    break;
                                case '<=':
                                    localResult = localResult && a <= b;
                                    break;
                                case '>=':
                                    localResult = localResult && a >= b;
                                    break;
                                case '~=':
                                    localResult = localResult 
                                        && (a.toString().localeCompare(b.toString(), undefined, { sensitivity: 'accent' }) === 0);
                                    break;
                                case '!~=':
                                    localResult = localResult 
                                        && (a.toString().localeCompare(b.toString(), undefined, { sensitivity: 'accent' }) !== 0);
                                    break;
                                default:
                                    localResult = false;
                                    break;
                            }
                        }
                    }

                    if (separator === 'or') {
                        globalResult = globalResult || localResult;
                    }
                    else {
                        globalResult = globalResult && localResult;
                    }
                }

                return globalResult ? (then ? this.parse(then) : CustomCommandEngine.trueVar) : (other ? this.parse(other) : '');
            } break;
            case 'repeat': {
                if (args.length < 2) {
                    throw new Error('Not enough parameters for repeat.');
                }

                const n = parseInt(await this.parse(args.shift()));
                if (isNaN(n) || n < 0) {
                    throw new Error('Invalid repeat number.');
                }
                this.assertLimit(ExecutionLimit.Repeat, n);

                let result = '';
                for (let i = 0; i < n; ++i) {
                    this.vars.set(CustomCommandEngine.specialVars.loopCounter, i.toString());
                    result += await this.parse(args[i % args.length]);
                }
                this.vars.delete(CustomCommandEngine.specialVars.loopCounter);
                return result.trim();
            } break;  
            case 'call': {
                if (args.length < 1) {
                    throw new Error('Missing function call.');
                }

                // The code to run
                const code = args.shift();

                // Parse new arguments, since this function was lazy evaluated
                const newArguments = [];
                for (let i = 0; i < args.length; ++i) {
                    newArguments.push(await this.parse(args[i]));
                }

                // Push existing arguments onto the stack
                this.stack.push([...this.arguments]);

                // Set new argument context
                this.arguments = newArguments;

                // Double parse, because this function was lazy evaluated
                // For example {call $function} needs to evaluate the $function variable
                // to get the code, and then evaluate that stored code
                const result = await this.parse(await this.parse(code));

                // Pop old arguments back
                this.arguments = this.stack.pop();

                return result;
            } break;
            
            default: return null;
        }
    }

    private async parseSelectorFunction(code: string, index: number, functionName: string): Promise<ResponseParseResult> {
        let nextOption: string = '';
        let options: string[] = [];
        let nestedDepth = 0;
        let paired = false;
        const startIndex = index;

        while (index < code.length) {
            const char = code.charAt(index);

            // Options are separated by list separators at depth 0
            if (char === SpecialChars.ListSeparator && nestedDepth === 0) {
                options.push(nextOption);
                nextOption = '';
                ++index;
            }
            else {
                // Nested function, ignore it for now
                if (char === SpecialChars.FunctionBegin) {
                    ++nestedDepth;
                }
                // End of a function
                else if (char === SpecialChars.FunctionEnd) {
                    // Parse until a function end at depth 0 is encountered
                    if (nestedDepth === 0) {
                        // Add next option if it is not empty
                        if (nextOption) {
                            options.push(nextOption);
                        }
                        paired = true;
                        ++index;
                        break;
                    }
                    --nestedDepth;
                }

                // Add every character to the response
                nextOption += char;
                ++index;
            }
        }
        let response: string;
        if (!paired) {
            response = code.slice(startIndex - 1, index);
        }
        else {
            response = await this.handleSelectorFunction(functionName, options);
        }
        return { response, index };
    }

    // This method is static so that it can be used for metadata parsing as well
    private static parseLazyEvalCode(code: string, index: number): ResponseParseResult | null {
        let response = '';
        let nestedDepth = 0;
        let paired = false;
        while (index < code.length) {
            const char = code.charAt(index);

            // Nested function, ignore it for now
            if (char === SpecialChars.FunctionBegin) {
                ++nestedDepth;
            }
            // End of a function
            else if (char === SpecialChars.FunctionEnd) {
                // Parse until a function end at depth 0 is encountered
                if (nestedDepth === 0) {
                    paired = true;
                    ++index;
                    break;
                }
                --nestedDepth;
            }

            // Add every character to the response
            response += char;
            ++index;
        }

        // The end was never reached
        if (!paired) {
            return null;
        }
        return { response, index };
    }

    private async parseFunction(code: string, index: number): Promise<ResponseParseResult> {
        let foundFunctionName = false;
        let functionName: string;
        let functionCall = '';
        let paired = false;
        const startIndex = index;

        while (index < code.length) {
            const char = code.charAt(index);

            // Nested function call
            if (char === SpecialChars.FunctionBegin) {
                const nested = await this.parseFunction(code, index + 1);
                functionCall += nested.response;
                index = nested.index;
            }
            // End of this function, finished parsing at this level
            else if (char === SpecialChars.FunctionEnd) {
                if (!foundFunctionName) {
                    functionName = functionCall;
                    functionCall = '';
                }
                paired = true;
                ++index;
                break;
            }
            // Variable replacement
            else if (char === SpecialChars.VarBegin && index !== startIndex) {
                const variable = await this.parseVariable(code, index + 1);
                functionCall += variable.response;
                index = variable.index;
            }
            // Just a regular character
            else {
                // Found where function name ends
                if (!foundFunctionName && CustomCommandEngine.nonVarChar.test(char)) {
                    // Move function name into functionName variable
                    // Keep adding characters (arguments) to functionCall
                    foundFunctionName = true;
                    functionName = functionCall;
                    functionCall = '';

                    // Remove whitespace between function name and arguments
                    while (CustomCommandEngine.whitespaceRegex.test(code.charAt(index))) {
                        ++index;
                    }

                    // Some functions use different evaluation

                    if (CustomCommandEngine.selectorFunctions.has(functionName)) {
                        return this.parseSelectorFunction(code, index, functionName);
                    }
                    else if (CustomCommandEngine.lazyEvalFunctions.has(functionName)) {
                        const lazyEval = CustomCommandEngine.parseLazyEvalCode(code, index);

                        // null means the parse was unsuccessful
                        if (lazyEval !== null) {
                            functionCall += lazyEval.response;
                            index = lazyEval.index;
                            paired = true;
                        }

                        break;
                    }
                }
                else {
                    functionCall += char;
                    ++index;
                }
            }
        }
        let response: string;
        if (!paired) {
            response = code.slice(startIndex - 1, index);
        }
        else {
            response = await this.handleFunction(functionName.trimLeft(), functionCall.trim()) ?? code.slice(startIndex - 1, index);
        }
        return { response, index };
    }

    private async parseVariable(code: string, index: number): Promise<ResponseParseResult> {
        let name = '';
        while (index < code.length) {
            const char = code.charAt(index);

            // Function inside variable name
            if (char === SpecialChars.FunctionBegin) {
                const nested = await this.parseFunction(code, index + 1);
                // TODO: It might not be wanted for all of the result to be part of the variable name...
                name += nested.response;
                index = nested.index;
            }
            // End of variable
            else if (CustomCommandEngine.nonVarChar.test(char)) {
                break;
            }
            else {
                name += char;
                ++index;
            }
        }
        return {
            // Empty variable, give $ back
            response: name ? this.handleVariable(name) : SpecialChars.VarBegin,
            index,
        };
    }

    // First level of parsing
    private async parse(code: string, index: number = 0): Promise<string> {
        if (++this.depth > CustomCommandEngine.maxParseDepth) {
            throw new Error(`Maximum parse depth (${CustomCommandEngine.maxParseDepth}) exceeded.`);
        }
        let response = '';
        while (index < code.length) {
            const char = code.charAt(index);

            // Beginning of a function
            if (char === SpecialChars.FunctionBegin) {
                const nested = await this.parseFunction(code, index + 1);
                response += nested.response;
                index = nested.index;
            }
            // Beginning of a variable
            else if (char === SpecialChars.VarBegin) {
                const variable = await this.parseVariable(code, index + 1);
                response += variable.response;
                index = variable.index;
            }
            // Any other character
            else {
                response += char;
                ++index;
            }
        }
        --this.depth;
        return response;
    }

    public async run(response: string) {
        if (this.options.universal) {
            if (await this.params.bot.handleCooldown(this.params.src, CustomCommandEngine.universalCooldownSet)) {
                const results: Dictionary<string> = { };
                const memberList = await this.params.bot.memberListService.getMemberListForGuild(this.params.guild.id);
                let errorCount = 0;
                for (const [id, member] of memberList) {
                    this.memberContext = member;
                    try {
                        this.limitProgress = { };
                        results[id] = await this.parse(response);
                    } catch (error) {
                        ++errorCount;
                    }
                }
                const attachment = new MessageAttachment(Buffer.from(JSON.stringify(results)), `spinda-universal-results.-${this.params.guild.id}-${new Date().valueOf()}.json`);
                const embed = this.params.bot.createEmbed(EmbedTemplates.Success);
                embed.setDescription(`Finished running universally with ${errorCount} error${errorCount === 1 ? '' : 's'}. You can run another universal command in five minutes.`);
                await this.params.src.send({ embeds: [embed], files: [attachment] });
            }
        }
        else if (await this.params.bot.handleCooldown(this.params.src, CustomCommandEngine.cooldownSet)) {
            this.memberContext = this.params.src.member;
            response = (await this.parse(response)).trim();
            if (!this.options.silent && response.length !== 0) {
                this.assertLimit(ExecutionLimit.Message, 1);
                await this.params.src.send(response);
            }
            else if (this.params.src.isInteraction && !this.params.src.interaction.replied) {
                this.assertLimit(ExecutionLimit.Message, 1);
                await this.params.src.reply({ content: '\u{2705}', ephemeral: true });
            }
        }
    }
}
