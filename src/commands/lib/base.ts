import { Message } from 'discord.js';
import { DiscordBot } from '../../bot';
import { GuildAttributes } from '../../data/model/guild';

export enum CommandCategory {
    Config,
    Utility,
    Fun,
    Pokengine,
    Secret,
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