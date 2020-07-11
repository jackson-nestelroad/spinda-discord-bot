import { BaseEvent } from './base';

export class ReadyEvent extends BaseEvent<'ready'> {
    run() {
        console.log(`Bot is logged in as ${this.bot.client.user.tag}`);
        this.bot.client.user.setActivity('Spinda!', { 
            type: 'LISTENING'
        }); 
    }
}