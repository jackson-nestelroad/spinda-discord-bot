import { BaseEvent } from './base';
import { DiscordBot } from '../bot';

const event = 'ready';

export class ReadyEvent extends BaseEvent<typeof event> {
    constructor(bot: DiscordBot) {
        super(bot, event);
    }
    run() {
        console.log(`Bot is logged in as ${this.bot.client.user.tag}`);
        this.bot.client.user.setActivity(`@${this.bot.name} help`, { 
            type: 'PLAYING',
        }); 
    }
}