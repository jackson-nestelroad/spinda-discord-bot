import { Message, MessageEmbed } from 'discord.js';
import { DiscordBot } from '../../bot';
import { GuildAttributes } from '../../data/model/guild';
import { ExpireAge, TimedCache } from '../../util/timed-cache';

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

export const StandardCooldowns = {
    Low: { seconds: 3 },
    Medium: { seconds: 5 },
    High: { seconds: 10 },
    Minute: { minutes: 1 },
} as const;

export abstract class Command {
    public abstract readonly name: string;
    public abstract readonly args: string;
    public abstract readonly description: string | string[];
    public abstract readonly category: CommandCategory;
    public abstract readonly permission: CommandPermission;

    private cooldownSet: TimedCache<string, number> = null;

    public abstract run(params: CommandParameters): Promise<void>;

    public initialize(): void {
        if (this.cooldown !== undefined) {
            this.cooldownSet = new TimedCache(this.cooldown);
            if (this.cooldownSet.expireAge <= 0) {
                this.cooldownSet = null;
            }
        }
    }

    public async execute(params: CommandParameters): Promise<void> {
        if (await params.bot.handleCooldown(params.msg, this.cooldownSet)) {
            return this.run(params);
        }
    }
}

export interface Command {
    readonly cooldown?: ExpireAge;
    readonly examples?: string[];

    addHelpFields?(embed: MessageEmbed): void;
}