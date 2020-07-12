import { Client } from 'discord.js';
import { BaseEvent } from './events/base';
import { ReadyEvent } from './events/ready';
import { MessageEvent } from './events/message';
import { Command } from './commands/lib/base';
import { Commands } from './commands';
import { DataService } from './data/data-service';
import { Environment } from './data/environment';

export class DiscordBot {
    public readonly name = 'Spinda';
    public readonly iconUrl = 'https://archives.bulbagarden.net/media/upload/d/d5/BT327.png';

    public listening: boolean;
    public client: Client;
    public commands: Map<string, Command>;

    public dataService: DataService;

    private events: Map<string, BaseEvent<any>> = new Map();

    constructor() {
        this.listening = true;
        this.client = new Client();
        this.dataService = new DataService();

        this.events.set('ready', new ReadyEvent(this, 'ready'));
        this.events.set('message', new MessageEvent(this, 'message'));

        this.refreshCommands();
    }

    public refreshCommands() {
        this.commands = Commands.buildCommandMap();
    }

    public run() {
        this.client.login(Environment.getDiscordToken()).catch(reason => {
            console.error(reason);
            process.exit(1);
        });
    }
}