import { ClientEvents } from 'discord.js';
import { DiscordBot } from '../bot';

export abstract class BaseEvent<K extends keyof ClientEvents> {
    constructor(
        protected bot: DiscordBot,
        public eventName: K,
    ) {
        this.bot.client.on(eventName, this.run.bind(this));
    }

    public abstract run(...args: ClientEvents[K]): void;
}