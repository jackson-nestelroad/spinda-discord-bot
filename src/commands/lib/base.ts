import { Message, MessageEmbed } from 'discord.js';
import { DiscordBot } from '../../bot';
import { GuildAttributes } from '../../data/model/guild';

export enum CommandCategory {
    Config = 'Config',
    Utility = 'Utility',
    Fun = 'Fun',
    External = 'External',
    Pokengine = 'Pok\u00E9ngine',
    Secret = 'Secret',
}

export enum CommandPermission {
    Owner,
    Administrator,
    Everyone,
}

export interface CommandParameters {
    bot: DiscordBot,
    msg: Message,
    args: string[],
    content: string,
    guild: GuildAttributes,
}

export interface Command {
    run: (params: CommandParameters) => Promise<void>;
    readonly name: string;
    readonly args: string;
    readonly description: string;
    readonly category: CommandCategory;
    readonly permission: CommandPermission;
    addHelpFields?: (embed: MessageEmbed) => void;
}