import { Client, MessageEmbed, User, Channel, Message } from 'discord.js';
import { BaseEvent } from './events/base';
import { ReadyEvent } from './events/ready';
import { MessageEvent } from './events/message';
import { Command } from './commands/lib/base';
import { Commands } from './commands';
import { DataService } from './data/data-service';
import { Environment } from './data/environment';
import { SpindaColors } from './commands/lib/spinda/spinda-colors';
import { MessageDeleteEvent } from './events/message-delete';
import { DiscordUtil } from './util/discord';
import { GuildMemberAddEvent } from './events/guild-member-add';
import { GuildMemberRemoveEvent } from './events/guild-member-remove';
import { GuildMemberUpdateEvent } from './events/guild-member-update';
import { GuildBanAddEvent } from './events/guild-ban-add';
import { GuildBanRemoveEvent } from './events/guild-ban-remove';
import { MessageUpdateEvent } from './events/message-update';
import { MessageDeleteBulkEvent } from './events/message-delete-bulk';
import { MemberListService } from './services/member-list';
import { MediaWikiService } from './services/media-wiki';
import { ResourceService } from './services/resources';

interface EmbedOptions {
    footer?: boolean | string;
    timestamp?: boolean;
    error?: boolean;
    success?: boolean;
}

export class DiscordBot {
    public readonly name = 'Spinda';
    public readonly iconUrl = 'https://archives.bulbagarden.net/media/upload/d/d5/BT327.png';

    public commands: Map<string, Command>;

    public readonly startedAt: Date;
    public readonly client: Client;
    public readonly dataService: DataService;
    public readonly resourceService: ResourceService;
    public readonly memberListService: MemberListService;
    public readonly mediaWikiService: MediaWikiService;

    private events: Array<BaseEvent<any>> = [];
    private readonly colors = {
        default: SpindaColors.spots.base.hexString(),
        error: '#F04947',
        success: '#43B581',
    } as const;

    constructor() {
        this.startedAt = new Date();
        this.client = new Client();
        this.dataService = new DataService();
        this.resourceService = new ResourceService();
        this.memberListService = new MemberListService(this);
        this.mediaWikiService = new MediaWikiService(this);

        this.dataService.initialize().then(() => {
            this.events.push(new ReadyEvent(this));
            this.events.push(new MessageEvent(this));
            this.events.push(new GuildMemberAddEvent(this));
            this.events.push(new GuildMemberRemoveEvent(this));
            this.events.push(new GuildMemberUpdateEvent(this));
            this.events.push(new GuildBanAddEvent(this));
            this.events.push(new GuildBanRemoveEvent(this));
            this.events.push(new MessageDeleteEvent(this));
            this.events.push(new MessageUpdateEvent(this));
            this.events.push(new MessageDeleteBulkEvent(this));

            this.refreshCommands();
        });
    }

    public refreshCommands() {
        this.commands = Commands.buildCommandMap();
    }

    public createEmbed(options: EmbedOptions = { 
        footer: true,
        timestamp: false,
    }): MessageEmbed {
        const embed = new MessageEmbed();
        
        if (options.error) {
            embed.setColor(this.colors.error);
        }
        else if (options.success) {
            embed.setColor(this.colors.success);
        }
        else {
            embed.setColor(this.colors.default);
        }
        
        if (options.timestamp) {
            embed.setTimestamp();
        }

        if (options.footer) {
            embed.setFooter(typeof options.footer === 'string' ? options.footer : this.name, this.iconUrl);
        }

        return embed;
    }

    public async sendError(msg: Message, error: any) {
        const embed = this.createEmbed({ footer: false, timestamp: false, error: true });
        embed.setDescription(error.message || error.toString());
        await msg.channel.send(embed);
    }

    public getUserFromMention(mention: string): User | null {
        const match = DiscordUtil.userMentionRegex.exec(mention);
        if (match) {
            return this.client.users.cache.get(match[1]) || null;
        }
        return null;
    }

    public getChannelFromMention(mention: string): Channel | null {
        const match = DiscordUtil.channelMentionRegex.exec(mention);
        if (match) {
            return this.client.channels.cache.get(match[1]) || null;
        }
        return null;
    }

    public run() {
        this.client.login(Environment.getDiscordToken()).catch(reason => {
            console.error(reason);
            process.exit(1);
        });
    }
}