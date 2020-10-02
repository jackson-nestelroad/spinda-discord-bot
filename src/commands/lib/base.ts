import { Message } from 'discord.js';
import { DiscordBot } from '../../bot';
import { GuildAttributes } from '../../data/model/guild';

export enum CommandCategory {
    Config = 'Config',
    Utility = 'Utility',
    Fun = 'Fun',
    Pokengine = 'Pok\u00E9ngine',
    Secret = 'Secret',
}

export enum CommandPermission {
    Owner,
    Administrator,
    Everyone,
}

export interface Command {
    run: (bot: DiscordBot, msg: Message, args: string[], guild: GuildAttributes) => Promise<void>;
    readonly name: string;
    readonly args: string;
    readonly description: string;
    readonly category: CommandCategory;
    readonly permission: CommandPermission;
}