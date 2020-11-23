import { User, GuildMember, Guild, Channel } from 'discord.js';
import { CommandParameters } from '../../commands/lib/base';
import { Validation } from './validate';
import { DataService } from '../../data/data-service';

interface ResponseParseResult {
    response: string;
    index: number;
}

enum SpecialChars {
    FunctionBegin = '{',
    FunctionEnd = '}',
    VarBegin = '$',
    VarAssign = '=',
    AttributeSeparator = '.',
}

export class CustomCommandEngine {
    private static readonly undefinedVar = 'undefined';
    private static readonly trueVar = 'true';
    private static readonly nonVarChar = /[^a-zA-Z\d\$>]/;
    private static readonly allArgumentsVar = 'ALL';

    private static readonly comparisonOperators = /\s*(!?==?|[<>]=?)\s*/g;

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
        region: guild => guild.region,
    };

    private static readonly channelParams: ReadonlyDictionary<(channel: Channel) => string> = {
        id: channel => channel.id,
        name: channel => (channel as any).name || CustomCommandEngine.undefinedVar,
        mention: channel => channel.toString(),
    };

    public static readonly AllOptions: ReadonlyDictionary<ReadonlyArray<string>> = {
        'Arguments': ['$N', `\$${CustomCommandEngine.allArgumentsVar}`],
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
            `{choose item1;item2;...}`,
            `{if val1 [=|!=|<|>|<=|>=] val2 [and|or] val3 [op] val4;then;else}`,
            `{if val1 [op] val2 [op] val3 ...;then;else}`,
            `{random a b}`,
            `{silent}`,
            `{delete}`,
        ],
    };

    private silent: boolean = false;
    private vars: Map<string, string> = new Map();

    private handleVariableNative(params: CommandParameters, name: string): string | undefined {
        if (name.match(/^\d+$/)) {
            const argIndex = parseInt(name);
            return !isNaN(argIndex) ? params.args[argIndex - 1] : undefined;
        }
        else if (name === CustomCommandEngine.allArgumentsVar) {
            return params.content ? params.content : undefined;
        }
        return this.vars.get(name);
    }

    private handleVariable(params: CommandParameters, name: string): string {
        return this.handleVariableNative(params, name) ?? CustomCommandEngine.undefinedVar;
    }

    private handleFunction(params: CommandParameters, call: string): string | null {
        let name = '';
        let args = '';

        // Split name and arguments if applicable
        const separator = call.match(CustomCommandEngine.nonVarChar);
        if (separator) {
            name = call.slice(0, separator.index);
            args = call.slice(separator.index).trim();
        }
        else {
            name = call;
        }

        // Variable function
        if (name.startsWith(SpecialChars.VarBegin)) {
            const varName = name.substr(1);
            // Assignment
            if (args.startsWith(SpecialChars.VarAssign)) {
                const rightSide = args.substr(1);
                const potentialValues = rightSide.split(/\s+or\s+/).map(val => val.trim());
                if (potentialValues.length > 1) {
                    // Pick first non-undefined value
                    let i = 0; 
                    for (i; i < potentialValues.length - 1; ++i) {
                        const potential = potentialValues[i];
                        if (potential !== CustomCommandEngine.undefinedVar) {
                            break;
                        }
                    }
                    this.vars.set(varName, potentialValues[i]);
                }
                else {
                    this.vars.set(varName, rightSide.trimLeft());
                }
                return '';
            }
            // Text replacement
            else if (!args) {
                return this.handleVariable(params, varName);
            }
            // Error
            else {
                return null;
            }
        }
        // Nested command call
        else if (name.startsWith(DataService.defaultPrefix)) {
            const cmd = name.substr(1);
            if (params.bot.commands.has(cmd)) {
                const command = params.bot.commands.get(cmd);
                if (Validation.validate(params, command, params.msg.member)) {   
                    command.run({
                        bot: params.bot,
                        msg: params.msg,
                        guild: params.guild,
                        content: args,
                        args: args.split(' '),
                    }).catch(err => params.bot.sendError(params.msg, err));
                }
            }
            return '';
        }
        // Some other built-in function
        else {
            switch (name) {
                case 'choose': {
                    const options = args.split(';');
                    return options[Math.floor(Math.random() * options.length)];
                } break;
                case 'time': {
                    return new Date().toLocaleTimeString();
                } break;
                case 'date': {
                    return new Date().toLocaleDateString();
                } break;
                case 'prefix': {
                    return params.guild.prefix;
                } break;
                case 'silent': {
                    this.silent = true;
                    return '';
                } break;
                case 'delete': {
                    if (params.msg.deletable) {
                        params.msg.delete().catch(err => params.bot.sendError(params.msg, err));
                    }
                    return '';
                } break;
                case 'random': {
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
                case 'if': {
                    const [wholeCondition, then, other] = args.split(';');
                    if (wholeCondition === undefined || then === undefined) {
                        return null;
                    }
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
                                default:
                                    localResult = false;
                                    break;
                            }
                        }

                        if (separator === 'or') {
                            globalResult = globalResult || localResult;
                        }
                        else {
                            globalResult = globalResult && localResult;
                        }
                    }

                    return globalResult ? (then || CustomCommandEngine.trueVar) : (other || null);
                } break;
                case 'user': {
                    if (args.startsWith(SpecialChars.AttributeSeparator)) {
                        const attr = args.substr(1);
                        if (CustomCommandEngine.userParams[attr]) {
                            return CustomCommandEngine.userParams[attr](params.msg.author);
                        }
                        else if (CustomCommandEngine.memberParams[attr]) {
                            return CustomCommandEngine.memberParams[attr](params.msg.member);
                        }
                        return null;
                    }
                    else {
                        return params.msg.author.toString();
                    }
                } break;
                case 'guild':
                case 'server': {
                    if (args.startsWith(SpecialChars.AttributeSeparator)) {
                        const attr = args.substr(1);
                        if (CustomCommandEngine.guildParams[attr]) {
                            return CustomCommandEngine.guildParams[attr](params.msg.guild);
                        }
                        return null;
                    }
                    else {
                        return params.msg.guild.toString();
                    }
                } break;
                case 'channel': {
                    if (args.startsWith(SpecialChars.AttributeSeparator)) {
                        const attr = args.substr(1);
                        if (CustomCommandEngine.channelParams[attr]) {
                            return CustomCommandEngine.channelParams[attr](params.msg.channel);
                        }
                        return null;
                    }
                    else {
                        return params.msg.channel.toString();
                    }
                } break;
                // This is not a function
                default: {
                    return null;
                } break;
            }
        }
    }

    private parseFunction(params: CommandParameters, code: string, index: number): ResponseParseResult {
        let functionCall = '';
        let paired = false;
        const startIndex = index;
        while (index < code.length) {
            const char = code.charAt(index);
            if (char === SpecialChars.FunctionBegin) {
                const nested = this.parseFunction(params, code, index + 1);
                functionCall += nested.response;
                index = nested.index;
            }
            else if (char === SpecialChars.FunctionEnd) {
                paired = true;
                ++index;
                break;
            }
            else if (char === SpecialChars.VarBegin && index !== startIndex) {
                const variable = this.parseVariable(params, code, index + 1);
                functionCall += variable.response;
                index = variable.index;
            }
            else {
                functionCall += char;
                ++index;
            }
        }
        let response: string;
        if (!paired) {
            response = code.slice(startIndex - 1, index);
        }
        else {
            response = this.handleFunction(params, functionCall.trimLeft()) ?? code.slice(startIndex - 1, index);
        }
        return { response, index };
    }

    private parseVariable(params: CommandParameters, code: string, index: number): ResponseParseResult {
        let name = '';
        while (index < code.length) {
            const char = code.charAt(index);
            if (char.match(CustomCommandEngine.nonVarChar)) {
                break;
            }
            else {
                name += char;
                ++index;
            }
        }
        return {
            response: this.handleVariable(params, name),
            index,
        };
    }

    // First level of parsing
    private parse(params: CommandParameters, code: string, index: number = 0): string {
        let response = '';
        while (index < code.length) {
            const char = code.charAt(index);
            if (char === SpecialChars.FunctionBegin) {
                const nested = this.parseFunction(params, code, index + 1);
                response += nested.response;
                index = nested.index;
            }
            else if (char === SpecialChars.VarBegin) {
                const variable = this.parseVariable(params, code, index + 1);
                response += variable.response;
                index = variable.index;
            }
            else {
                response += char;
                ++index;
            }
        }
        return response;
    }

    public async run(params: CommandParameters, response: string) {
        response = this.parse(params, response).trim();
        if (!this.silent && response.length !== 0) {
            await params.msg.channel.send(response);
        }
    }
}