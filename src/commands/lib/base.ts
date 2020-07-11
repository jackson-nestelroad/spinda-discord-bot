import { Message } from 'discord.js';
import { DiscordBot } from '../../bot';

export enum CommandCategory {
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
    run: (bot: DiscordBot, msg: Message, args: string[]) => Promise<void>;
    readonly names: string[];
    readonly args: string;
    readonly description: string;
    readonly category: CommandCategory;
    readonly permission: CommandPermission;
}