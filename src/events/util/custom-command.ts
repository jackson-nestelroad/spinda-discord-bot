import { User, GuildMember, Guild, Channel } from 'discord.js';
import { CommandParameters } from '../../commands/lib/base';
import { Validation } from './validate';

enum VariableMatchGroups {
    CommandParam = 1,
    ParamNumber = 2,
    UserVar = 3,
    UserAttribute = 4,
    GuildVar = 5,
    GuildAttribute = 6,
    ChannelVar = 7,
    ChannelAttribute = 8,
    ChooseFunction = 9,
    ChooseList = 10,
    CommandFunction = 11,
    CommandName = 12,
    CommandArgs = 13,
    SilentOption = 14,
    TimeFunction = 15,
    DateFunction = 16,
    DeleteFunction = 17,
    PrefixFunction = 18,
    RandomFunction = 19,
    RandomFirstNum = 20,
    RandomSecondNum = 21,
}

export class CustomCommandEngine {
    private static readonly variableRegex = new RegExp(
        '(\\$(\\d+))'
        + '|(\\{user(?:\\.([a-zA-Z]+))?\\})'
        + '|(\\{(?:guild|server)(?:\\.([a-zA-Z]+))?\\})'
        + '|(\\{channel(?:\\.([a-zA-Z]+))?\\})'
        + '|(\\{choose:(?:\\s+)?((?:[^\\}]+)?(?:,(?:\\s+)?.+)*)\\})'
        + '|(\\{>([a-z]+)((?:(?:\\{[^\\}]+\\})|(?:[^\\}]))*)\\})'
        + '|(\\{silent\\})'
        + '|(\\{time\\})'
        + '|(\\{date\\})'
        + '|(\\{delete\\})'
        + '|(\\{prefix\\})'
        + '|(\\{random(?:(?:\\s+)(\\d+)(?:(?:\\s+)(\\d+))?)?\\})'
    , 'g');

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
        icon: guild => guild.iconURL(),
        memberCount: guild => guild.memberCount.toString(),
        ownerId: guild => guild.ownerID,
        createdAt: guild => guild.createdAt.toLocaleDateString(),
        region: guild => guild.region,
    };

    private static readonly channelParams: ReadonlyDictionary<(channel: Channel) => string> = {
        id: channel => channel.id,
        name: channel => (channel as any).name || 'undefined',
        mention: channel => channel.toString(),
    };

    public static readonly AllOptions: ReadonlyDictionary<ReadonlyArray<string>> = {
        'Arguments': ['$N'],
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
            `{choose:item1,item2,...}`,
            `{time}`,
            `{date}`,
            `{prefix}`,
        ],
        'Functions': [
            `{>command arg1 arg2 ...}`,
            `{random a b}`,
            `{silent}`,
            `{delete}`,
        ],
    };

    private silent: boolean = false;

    private replaceMatch(match: RegExpMatchArray, src: string, replacement: string, delta: number): [string, number] {
        return [
            src.substr(0, match.index + delta) + replacement + src.substr(match.index + match[0].length + delta),
            delta + (replacement.length - match[0].length),
        ];
    }

    // Parse a response string
    private parse(params: CommandParameters, response: string): string {
        const { bot, msg, args, guild } = params;

        // Replace all parameters and variables
        let delta = 0;
        const varMatches = [...response.matchAll(CustomCommandEngine.variableRegex)];
        for (const match of varMatches) {
            if (match[VariableMatchGroups.CommandParam]) {
                const index = parseInt(match[VariableMatchGroups.ParamNumber]);
                [response, delta] = this.replaceMatch(match, response, args[index - 1] || 'undefined', delta);
            }
            else if (match[VariableMatchGroups.UserVar]) {
                const attribute = match[VariableMatchGroups.UserAttribute];
                if (attribute) {
                    if (CustomCommandEngine.userParams[attribute]) {
                        [response, delta] = this.replaceMatch(match, response, CustomCommandEngine.userParams[attribute](msg.author), delta);
                    }
                    else if (CustomCommandEngine.memberParams[attribute]) {
                        [response, delta] = this.replaceMatch(match, response, CustomCommandEngine.memberParams[attribute](msg.member), delta);
                    }
                }
                else {
                    [response, delta] = this.replaceMatch(match, response, msg.author.toString(), delta);
                }
            }
            else if (match[VariableMatchGroups.GuildVar]) {
                const attribute = match[VariableMatchGroups.GuildAttribute];
                if (attribute) {
                    if (CustomCommandEngine.guildParams[attribute]) {
                        [response, delta] = this.replaceMatch(match, response, CustomCommandEngine.guildParams[attribute](msg.guild), delta);
                    }
                }
                else {
                    [response, delta] = this.replaceMatch(match, response, msg.guild.toString(), delta);
                }
            }
            else if (match[VariableMatchGroups.ChannelVar]) {
                const attribute = match[VariableMatchGroups.ChannelAttribute];
                if (attribute) {
                    if (CustomCommandEngine.channelParams[attribute]) {
                        [response, delta] = this.replaceMatch(match, response, CustomCommandEngine.channelParams[attribute](msg.channel), delta);
                    }
                }
                else {
                    [response, delta] = this.replaceMatch(match, response, msg.channel.toString(), delta);
                }
            }
            else if (match[VariableMatchGroups.ChooseFunction]) {
                const options = match[VariableMatchGroups.ChooseList].split(',').map(val => val.trim());
                [response, delta] = this.replaceMatch(match, response, options[Math.floor(Math.random() * options.length)], delta);
            }
            else if (match[VariableMatchGroups.CommandFunction]) {
                const cmd = match[VariableMatchGroups.CommandName];
                let content = match[VariableMatchGroups.CommandArgs] || '';
                content = this.parse(params, content);
                const args = content.split(' ');
                if (bot.commands.has(cmd)) {
                    const command = bot.commands.get(cmd);
                    if (Validation.validate(bot, command, msg.member)) {   
                        command.run({ bot, msg, args, content, guild }).catch(err => bot.sendError(msg, err));
                    }
                }
                [response, delta] = this.replaceMatch(match, response, '', delta);
            }
            else if (match[VariableMatchGroups.SilentOption]) {
                this.silent = true;
            }
            else if (match[VariableMatchGroups.TimeFunction]) {
                [response, delta] = this.replaceMatch(match, response, new Date().toLocaleTimeString(), delta);
            }
            else if (match[VariableMatchGroups.DateFunction]) {
                [response, delta] = this.replaceMatch(match, response, new Date().toLocaleDateString(), delta);
            }
            else if (match[VariableMatchGroups.DeleteFunction]) {
                msg.delete().catch(err => bot.sendError(msg, err));
                [response, delta] = this.replaceMatch(match, response, '', delta);
            }
            else if (match[VariableMatchGroups.PrefixFunction]) {
                [response, delta] = this.replaceMatch(match, response, guild.prefix, delta);
            }
            else if (match[VariableMatchGroups.RandomFunction]) {
                let first = parseInt(match[VariableMatchGroups.RandomFirstNum]);
                let second = parseInt(match[VariableMatchGroups.RandomSecondNum]);
                if (isNaN(second)) {
                    if (!isNaN(first)) {
                        second = first;
                    }
                    else {
                        second = 10;
                    }
                    first = 0;
                }
                else if (isNaN(first)) {
                    first = 0;
                    second = 10;
                }
                else if (second < first) {
                    let temp = first;
                    first = second;
                    second = temp;
                }
                const num = Math.floor((Math.random() * (second - first + 1) + first));
                [response, delta] = this.replaceMatch(match, response, num.toString(), delta);
            }
        }

        return response.trim();
    }

    public async run(params: CommandParameters, response: string) {
        response = this.parse(params, response);
        if (!this.silent && response.length !== 0) {
            await params.msg.channel.send(response);
        }
    }
}