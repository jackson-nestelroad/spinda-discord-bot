import { Client, MessageEmbed, User, Channel, Message, GuildMember } from 'discord.js';
import { BaseEvent } from './events/base';
import { ReadyEvent } from './events/ready';
import { MessageEvent } from './events/message';
import { Command } from './commands/lib/base';
import { Commands } from './commands';
import { DataService } from './data/data-service';
import { Environment } from './data/environment';
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
import { TimeoutService } from './services/timeout';
import { TimedCache } from './util/timed-cache';
import { SpindaGeneratorService } from './commands/lib/spinda/generator';
import { EmbedOptions, EmbedProps, EmbedTemplates } from './util/embed';

export class DiscordBot {
    public readonly name = 'Spinda';
    public readonly iconUrl = 'https://archives.bulbagarden.net/media/upload/d/d5/BT327.png';

    public commands: Map<string, Command>;

    public readonly startedAt = new Date();
    public readonly client = new Client();
    public readonly dataService = new DataService(this);
    public readonly resourceService = new ResourceService(this);
    public readonly memberListService = new MemberListService(this);
    public readonly mediaWikiService = new MediaWikiService(this);
    public readonly timeoutService = new TimeoutService(this);
    public readonly spindaGeneratorService = new SpindaGeneratorService(this);

    private events: Array<BaseEvent<any>> = [];

    public refreshCommands() {
        this.commands = Commands.buildCommandMap();
    }

    public createEmbed(options: EmbedProps | EmbedOptions = new EmbedOptions()): MessageEmbed {
        if (!(options instanceof EmbedOptions)) {
            options = new EmbedOptions(options);
        }
        return (options as EmbedOptions).create(this);
    }

    public async sendError(msg: Message, error: any) {
        const embed = this.createEmbed(EmbedTemplates.Error);
        embed.setDescription(error.message || error.toString());
        await msg.channel.send(embed);
    }

    public async getMemberFromString(str: string, guildId: string): Promise<GuildMember | null> {
        // Try mention first
        const guild = this.client.guilds.cache.get(guildId);
        const match = DiscordUtil.userMentionRegex.exec(str);
        if (match) {
            const user = this.client.users.cache.get(match[1]);
            return user ? guild.member(user) : null;
        }

        // Try user ID then username
        const members = await this.memberListService.getMemberListForGuild(guildId);
        if (members.has(str)) {
            return members.get(str);
        }
        return members.find(member => str.localeCompare(member.user.username, undefined, { sensitivity: 'accent' }) === 0) || null;
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

    public async initialize() {
        await this.dataService.initialize();

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
    }

    
    public async handleCooldown(msg: Message, cooldownSet: TimedCache<string, number>): Promise<boolean> {
        if (cooldownSet) {
            const offenses = cooldownSet.get(msg.author.id);
            if (offenses === undefined) {
                cooldownSet.set(msg.author.id, 0);
            }
            else {
                if (offenses === 0) {
                    cooldownSet.update(msg.author.id, 1);
                    const reply = await msg.reply('slow down!');
                    await reply.delete({ timeout: 10000 });
                }
                else if (offenses >= 5) {
                    await this.timeoutService.timeout(msg.author);
                }
                else {
                    cooldownSet.update(msg.author.id, offenses + 1);
                }
                return false;
            }
        }
        return true;
    }

    public async run() {
        try {
            await this.client.login(Environment.getDiscordToken());
        } catch (error) {
            console.error(error);
            process.exit(1);
        }
    }
}