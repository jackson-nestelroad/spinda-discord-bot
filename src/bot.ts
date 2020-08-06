import { Client, MessageEmbed } from 'discord.js';
import { BaseEvent } from './events/base';
import { ReadyEvent } from './events/ready';
import { MessageEvent } from './events/message';
import { Command } from './commands/lib/base';
import { Commands } from './commands';
import { DataService } from './data/data-service';
import { Environment } from './data/environment';
import { SpindaColors } from './commands/lib/spinda/spinda-colors';

interface EmbedOptions {
    footer?: boolean | string;
    timestamp?: boolean;
}

export class DiscordBot {
    public readonly name = 'Spinda';
    public readonly iconUrl = 'https://archives.bulbagarden.net/media/upload/d/d5/BT327.png';

    public listening: boolean;
    public commands: Map<string, Command>;

    public readonly startedAt: Date;
    public readonly client: Client;
    public readonly dataService: DataService;

    private events: Map<string, BaseEvent<any>> = new Map();

    constructor() {
        this.listening = true;
        this.startedAt = new Date();
        this.client = new Client();
        this.dataService = new DataService();

        this.events.set('ready', new ReadyEvent(this));
        this.events.set('message', new MessageEvent(this));

        this.refreshCommands();
    }

    public refreshCommands() {
        this.commands = Commands.buildCommandMap();
    }

    public createEmbed(options: EmbedOptions = { 
        footer: true,
        timestamp: false,
    }): MessageEmbed {
        const embed = new MessageEmbed();
        embed.setColor(SpindaColors.spots.base.hexString);
        
        if (options.timestamp) {
            embed.setTimestamp();
        }

        if (options.footer) {
            embed.setFooter(typeof options.footer === 'string' ? options.footer : this.name, this.iconUrl);
        }

        return embed;
    }

    public run() {
        this.client.login(Environment.getDiscordToken()).catch(reason => {
            console.error(reason);
            process.exit(1);
        });
    }
}