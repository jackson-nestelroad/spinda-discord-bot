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
    low: { seconds: 3 },
    medium: { seconds: 5 },
    high: { seconds: 10 },
    minute: { minutes: 1 },
}

export abstract class Command {
    public abstract readonly name: string;
    public abstract readonly args: string;
    public abstract readonly description: string;
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
        if (this.cooldownSet) {
            const offenses = this.cooldownSet.get(params.msg.author.id);
            if (offenses === undefined) {
                this.cooldownSet.set(params.msg.author.id, 0);
            }
            else {
                if (offenses === 0) {
                    this.cooldownSet.update(params.msg.author.id, 1);
                    const reply = await params.msg.reply('slow down!');
                    await reply.delete({ timeout: 10000 });
                }
                else if (offenses >= 5) {
                    await params.bot.timeoutService.timeout(params.msg.author);
                }
                else {
                    this.cooldownSet.update(params.msg.author.id, offenses + 1);
                }
                return;
            }
        }
        return this.run(params);
    }
}

export interface Command {
    readonly cooldown?: ExpireAge;

    addHelpFields?(embed: MessageEmbed): void;
}