import { User, GuildMember, Guild, Channel, Role } from 'discord.js';
import { CommandParameters } from '../../commands/lib/base';
import { Validation } from './validate';
import { DataService } from '../../data/data-service';
import *  as mathjs from 'mathjs';
import { TimedCache } from '../../util/timed-cache';

interface ResponseParseResult {
    response: string;
    index: number;
}

enum SpecialChars {
    FunctionBegin = '{',
    FunctionEnd = '}',
    VarBegin = '$',
    VarAssign = '=',
    FunctionAssign = ':=',
    AttributeSeparator = '.',
    ListSeparator = ';',
}

export class CustomCommandEngine {
    private static readonly undefinedVar = 'undefined';
    private static readonly trueVar = 'true';
    private static readonly falseVar = 'false';
    private static readonly nonVarChar = /[^a-zA-Z\d_!?\$>\+-]/;
    private static readonly whitespaceRegex = /\s/;
    private static readonly maxParseDepth = 32;

    private static readonly specialVars = {
        allArguments: 'ALL',
        loopCounter: 'i',
        regexMatchGroup: 'match-group-',
        regexMatchBegin: 'match-begin',
        regexMatchEnd: 'match-end',
        functionArgument: 'arg-',
    } as const;

    private static readonly limits: ReadonlyDictionary<number> = {
        repeat: 64,
        wait: 10000,
        message: 5,
        command: 10,
    };

    private static readonly comparisonOperators = /\s*(==|!?~?=|[<>]=?)\s*/g;
    private static readonly regexRegex = /^\/([^\/\\]*(?:\\.[^\/\\]*)*)\/([gimsuy]*)(?: ((?:.|\n)*))?$/;

    private static readonly cooldownSet: TimedCache<string, number> = new TimedCache({ seconds: 3 });

    constructor(private params: CommandParameters) { }

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
        'Arguments': [
            '$N',
            `\$${CustomCommandEngine.specialVars.allArguments}`,
            `\$${CustomCommandEngine.specialVars.loopCounter} (in repeat)`,
            `\$${CustomCommandEngine.specialVars.regexMatchBegin} (after regex)`,
            `\$${CustomCommandEngine.specialVars.regexMatchEnd} (after regex)`,
            `\$${CustomCommandEngine.specialVars.regexMatchGroup}N (after regex)`,
            `\$${CustomCommandEngine.specialVars.functionArgument}N (in function call)`,
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
            `{math expression}`,
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
        'Programming:': [
            `{quote text}`,
            `{$function-name := {function code}}`,
            `{eval code}`,
            `{eval $function-name}`,
            `{call $function-name;arg1;arg2}`,
        ],
    };

    private silent: boolean = false;
    private vars: Map<string, string> = new Map();
    private arguments: string[] = [];
    private stack: Array<string[]> = [];
    private depth: number = 0;
    private updatedMember: GuildMember = null;
    private limitProgress: Dictionary<number> = { };

    private assertLimit(name: string, increase: number) {
        if (!this.limitProgress[name]) {
            this.limitProgress[name] = 0;
        }
        if (increase + this.limitProgress[name] > CustomCommandEngine.limits[name]) {
            throw new Error(`${name[0].toUpperCase()}${name.substr(1)} limit (${CustomCommandEngine.limits[name]}) exceeded`);
        }
        this.limitProgress[name] += increase;
    }

    private getMember(): GuildMember {
        return this.updatedMember ?? this.params.msg.member;
    }

    private handleVariableNative(name: string): string | undefined {
        if (/^\d+$/.test(name)) {
            const argIndex = parseInt(name);
            return !isNaN(argIndex) ? this.params.args[argIndex - 1] : undefined;
        }
        else if (name === CustomCommandEngine.specialVars.allArguments) {
            return this.params.content;
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

    private handleVariable(name: string): string {
        return this.handleVariableNative(name) ?? CustomCommandEngine.undefinedVar;
    }

    private getRole(search: string): Role {
        // Find role by ID
        let role = this.params.msg.guild.roles.cache.get(search);
        // Find role by name instead
        if (!role) {
            role = this.params.msg.guild.roles.cache.find(role => search.localeCompare(role.name, undefined, { sensitivity: 'accent'}) === 0);
        }
        return role;
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
                    this.vars.set(varName, potentialValues[i]);
                }
                else {
                    this.vars.set(varName, rightSide.trimLeft());
                }
                return '';
            }
            // Function assignment, which means no null coalescing
            if (args.startsWith(SpecialChars.FunctionAssign)) {
                const rightSide = args.substr(SpecialChars.FunctionAssign.length);
                this.vars.set(varName, rightSide.trim());
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
        // Nested command call
        else if (name.startsWith(DataService.defaultPrefix)) {
            this.assertLimit('command', 1);
            const cmd = name.substr(1);
            if (this.params.bot.commands.has(cmd)) {
                const command = this.params.bot.commands.get(cmd);
                if (Validation.validate(this.params, command, this.getMember())) {
                    args = args.trim();
                    if (args === CustomCommandEngine.undefinedVar) {
                        args = '';
                    }
                    await command.execute({
                        bot: this.params.bot,
                        msg: this.params.msg,
                        guild: this.params.guild,
                        content: args,
                        args: args ? args.split(' ') : [],
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
                    this.silent = true;
                    return '';
                } break;
                case 'delete': {
                    if (this.params.msg.deletable) {
                        await this.params.msg.delete();
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
                        throw new Error('Invalid value for wait');
                    }
                    this.assertLimit(name, ms);
                    await new Promise(resolve => setTimeout(() => resolve(), ms));
                    return '';
                } break;
                case 'message': {
                    this.assertLimit(name, 1);
                    await this.params.msg.channel.send(args);
                    return '';
                } break;
                case 'embed': {
                    this.assertLimit('message', 1);
                    const embed = this.params.bot.createEmbed();
                    embed.setDescription(args);
                    await this.params.msg.channel.send(embed);
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
                        throw new Error('Invalid value for substring');
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
                case 'role': {
                    const role = this.getRole(args);
                    if (!role) {
                        throw new Error(`Role "${args}" could not be found`);
                    }

                    const memberRoles = this.getMember().roles;
                    if (memberRoles.cache.has(role.id)) {
                        this.updatedMember = await memberRoles.remove(role);
                    }
                    else {
                        this.updatedMember = await memberRoles.add(role)
                    }
                    return '';
                } break;
                case 'role?': {
                    const role = this.getRole(args);
                    if (!role) {
                        throw new Error(`Role "${args}" could not be found`);
                    }

                    return this.getMember().roles.cache.has(role.id) ? CustomCommandEngine.trueVar : CustomCommandEngine.falseVar;
                } break;
                case '+role': {
                    const role = this.getRole(args);
                    if (!role) {
                        throw new Error(`Role "${args}" could not be found`);
                    }

                    this.updatedMember = await this.getMember().roles.add(role);
                    return '';
                } break;
                case '-role': {
                    const role = this.getRole(args);
                    if (!role) {
                        throw new Error(`Role "${args}" could not be found`);
                    }

                    this.updatedMember = await this.getMember().roles.remove(role);
                    return '';
                } break;
                case 'user': {
                    if (args.startsWith(SpecialChars.AttributeSeparator)) {
                        const attr = args.substr(1);
                        if (CustomCommandEngine.userParams[attr]) {
                            return CustomCommandEngine.userParams[attr](this.params.msg.author);
                        }
                        else if (CustomCommandEngine.memberParams[attr]) {
                            return CustomCommandEngine.memberParams[attr](this.getMember());
                        }
                        return null;
                    }
                    else {
                        return this.params.msg.author.toString();
                    }
                } break;
                case 'guild':
                case 'server': {
                    if (args.startsWith(SpecialChars.AttributeSeparator)) {
                        const attr = args.substr(1);
                        if (CustomCommandEngine.guildParams[attr]) {
                            return CustomCommandEngine.guildParams[attr](this.params.msg.guild);
                        }
                        return null;
                    }
                    else {
                        return this.params.msg.guild.toString();
                    }
                } break;
                case 'channel': {
                    if (args.startsWith(SpecialChars.AttributeSeparator)) {
                        const attr = args.substr(1);
                        if (CustomCommandEngine.channelParams[attr]) {
                            return CustomCommandEngine.channelParams[attr](this.params.msg.channel);
                        }
                        return null;
                    }
                    else {
                        return this.params.msg.channel.toString();
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
                    throw new Error('Not enough parameters for repeat');
                }

                const n = parseInt(await this.parse(args.shift()));
                if (isNaN(n) || n < 0) {
                    throw new Error('Invalid repeat number');
                }
                this.assertLimit(name, n);

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
                    throw new Error('Missing function call');
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

    private async parseLazyEvalCode(code: string, index: number): Promise<ResponseParseResult | null> {
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
                        const lazyEval = await this.parseLazyEvalCode(code, index);

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
            throw new Error(`Maximum parse depth (${CustomCommandEngine.maxParseDepth}) exceeded`);
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
        if (await this.params.bot.handleCooldown(this.params.msg, CustomCommandEngine.cooldownSet)) {
            response = (await this.parse(response)).trim();
            if (!this.silent && response.length !== 0) {
                this.assertLimit('message', 1);
                await this.params.msg.channel.send(response);
            }
        }
    }
}
