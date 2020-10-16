import { User, GuildMember, Guild, Channel } from 'discord.js';
import { CommandParameters } from '../../commands/lib/base';

export namespace CustomCommandEngine {
    const variableRegex = new RegExp(
        '(\\$(\\d+))'
        + '|(\\{user(?:\\.([a-zA-Z]+))?\\})'
        + '|(\\{(?:guild|server)(?:\\.([a-zA-Z]+))?\\})'
        + '|(\\{channel(?:\\.([a-zA-Z]+))?\\})'
        + '|(\\{choose:(?:\\s+)?(.+(?:,(?:\\s+)?.+)*)\\})'
        + '|(\\{>([a-z]+)(.+)?\\})'
        + '|(\\{silent\\})'
        + '|(\\{time\\})'
        + '|(\\{date\\})'
        + '|(\\{delete\\})'
        + '|(\\{prefix\\})'
    , 'g');

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
        PrefixFunction = 18
    }

    const userParams: ReadonlyDictionary<(user: User) => string> = {
        name: user => user.username,
        id: user => user.id,
        tag: user => user.tag,
        discriminator: user => user.discriminator,
        status: user => user.presence.status,
        avatar: user => user.avatar,
        mention: user => user.toString(),
        createdAt: user => user.createdAt.toLocaleDateString(),
    };

    const memberParams: ReadonlyDictionary<(member: GuildMember) => string> = {
        nickname: member => member.displayName,
        joinedAt: member => member.joinedAt.toLocaleDateString(),
    };

    const guildParams: ReadonlyDictionary<(guild: Guild) => string> = {
        id: guild => guild.id,
        name: guild => guild.name,
        icon: guild => guild.iconURL(),
        memberCount: guild => guild.memberCount.toString(),
        ownerId: guild => guild.ownerID,
        createdAt: guild => guild.createdAt.toLocaleDateString(),
        region: guild => guild.region,
    };

    const channelParams: ReadonlyDictionary<(channel: Channel) => string> = {
        id: channel => channel.id,
        name: channel => (channel as any).name || 'undefined',
        mention: channel => channel.toString(),
    };

    export const AllOptions: ReadonlyDictionary<ReadonlyArray<string>> = {
        'Arguments': ['$N'],
        'User Variables': [
            '{user}',
            ...Object.keys(userParams).map(key => `{user.${key}}`),
            ...Object.keys(memberParams).map(key => `{user.${key}}`),
        ],
        'Server Variables': [
            '{server}',
            ...Object.keys(guildParams).map(key => `{server.${key}}`),
        ],
        'Channel Variables': [
            '{channel}',
            ...Object.keys(channelParams).map(key => `{channel.${key}}`),
        ],
        'Other Variables': [
            `{choose:item1,item2,...}`,
            `{time}`,
            `{date}`,
            `{prefix}`,
        ],
        'Functions': [
            `{>command arg1 arg2 ...}`,
            `{silent}`,
            `{delete}`,
        ],
    };

    function replaceMatch(match: RegExpMatchArray, src: string, replacement: string, delta: number): [string, number] {
        return [
            src.substr(0, match.index + delta) + replacement + src.substr(match.index + match[0].length + delta),
            delta + (replacement.length - match[0].length),
        ];
    }

    export async function run({ bot, msg, args, guild }: CommandParameters, response: string) {
        let silent = false;

        // Replace all parameters and variables
        let delta = 0;
        const varMatches = [...response.matchAll(variableRegex)];
        for (const match of varMatches) {
            if (match[VariableMatchGroups.CommandParam]) {
                const index = parseInt(match[VariableMatchGroups.ParamNumber]);
                [response, delta] = replaceMatch(match, response, args[index - 1] || 'undefined', delta);
            }
            else if (match[VariableMatchGroups.UserVar]) {
                const attribute = match[VariableMatchGroups.UserAttribute];
                if (attribute) {
                    if (userParams[attribute]) {
                        [response, delta] = replaceMatch(match, response, userParams[attribute](msg.author), delta);
                    }
                    else if (memberParams[attribute]) {
                        const member = msg.guild.members.cache.get(msg.author.id);
                        [response, delta] = replaceMatch(match, response, memberParams[attribute](member), delta);
                    }
                }
                else {
                    [response, delta] = replaceMatch(match, response, msg.author.toString(), delta);
                }
            }
            else if (match[VariableMatchGroups.GuildVar]) {
                const attribute = match[VariableMatchGroups.GuildAttribute];
                if (attribute) {
                    if (guildParams[attribute]) {
                        [response, delta] = replaceMatch(match, response, guildParams[attribute](msg.guild), delta);
                    }
                }
                else {
                    [response, delta] = replaceMatch(match, response, msg.guild.toString(), delta);
                }
            }
            else if (match[VariableMatchGroups.ChannelVar]) {
                const attribute = match[VariableMatchGroups.ChannelAttribute];
                if (attribute) {
                    if (channelParams[attribute]) {
                        [response, delta] = replaceMatch(match, response, channelParams[attribute](msg.channel), delta);
                    }
                }
                else {
                    [response, delta] = replaceMatch(match, response, msg.channel.toString(), delta);
                }
            }
            else if (match[VariableMatchGroups.ChooseFunction]) {
                const options = match[VariableMatchGroups.ChooseList].split(',').map(val => val.trim());
                [response, delta] = replaceMatch(match, response, options[Math.floor(Math.random() * options.length)], delta);
            }
            else if (match[VariableMatchGroups.CommandFunction]) {
                const cmd = match[VariableMatchGroups.CommandName];
                const content = match[VariableMatchGroups.CommandArgs].trim();
                const args = content.split(' ');
                if (bot.commands.has(cmd)) {
                    bot.commands.get(cmd).run({ bot, msg, args, content, guild }).catch(err => bot.sendError(msg, err));
                    [response, delta] = replaceMatch(match, response, '', delta);
                }
            }
            else if (match[VariableMatchGroups.SilentOption]) {
                silent = true;
            }
            else if (match[VariableMatchGroups.TimeFunction]) {
                [response, delta] = replaceMatch(match, response, new Date().toLocaleTimeString(), delta);
            }
            else if (match[VariableMatchGroups.DateFunction]) {
                [response, delta] = replaceMatch(match, response, new Date().toLocaleDateString(), delta);
            }
            else if (match[VariableMatchGroups.DeleteFunction]) {
                msg.delete().catch(err => bot.sendError(msg, err));
                [response, delta] = replaceMatch(match, response, '', delta);
            }
            else if (match[VariableMatchGroups.PrefixFunction]) {
                [response, delta] = replaceMatch(match, response, guild.prefix, delta);
            }
        }

        if (!silent && response.length !== 0) {
            await msg.channel.send(response);
        }
    }
}