import { Client, MessageEmbed, User, Channel, Message, GuildMember, Intents, CommandInteraction, GuildChannel, Role, Snowflake } from 'discord.js';
import { BaseEvent } from './events/base';
import { ReadyEvent } from './events/ready';
import { MessageEvent } from './events/message';
import { CommandMap } from './commands/lib/base';
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
import { CommandSource } from './util/command-source';
import { InteractionEvent } from './events/interaction';

export class DiscordBot {
    public readonly name = 'Spinda';
    public readonly iconUrl = 'https://archives.bulbagarden.net/media/upload/d/d5/BT327.png';

    public commands: CommandMap<string>;

    public readonly startedAt = new Date();
    public readonly client = new Client({
        intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_BANS,
            Intents.FLAGS.GUILD_MEMBERS,
            Intents.FLAGS.GUILD_MESSAGES,
        ],
    });
    public readonly dataService = new DataService(this);
    public readonly resourceService = new ResourceService(this);
    public readonly memberListService = new MemberListService(this);
    public readonly mediaWikiService = new MediaWikiService(this);
    public readonly timeoutService = new TimeoutService(this);
    public readonly spindaGeneratorService = new SpindaGeneratorService(this);

    private events: Array<BaseEvent<any>> = [];
    private slashCommandsEnabled: boolean = false;

    public refreshCommands() {
        this.commands = Commands.buildCommandMap();
    }

    public enableSlashCommands() {
        if (!this.slashCommandsEnabled) {
            this.events.push(new InteractionEvent(this));
            this.slashCommandsEnabled = true;
        }
    }

    public createEmbed(options: EmbedProps | EmbedOptions = new EmbedOptions()): MessageEmbed {
        if (!(options instanceof EmbedOptions)) {
            options = new EmbedOptions(options);
        }
        return (options as EmbedOptions).create(this);
    }

    public async sendError(src: CommandSource, error: any) {
        const embed = this.createEmbed(EmbedTemplates.Error);
        embed.setDescription(error.message || error.toString());
        await src.send({ embeds: [embed], ephemeral: true });
    }

    public splitIntoArgs(str: string): string[] {
        return str.split(' ');
    }

    public async getMemberFromString(str: string, guildId: Snowflake): Promise<GuildMember | null> {
        // Try mention first
        const guild = this.client.guilds.cache.get(guildId);
        const match = DiscordUtil.userMentionRegex.exec(str);
        if (match) {
            return guild.members.cache.get(match[1] as Snowflake) || null;
        }

        // Try user ID then username
        const members = await this.memberListService.getMemberListForGuild(guildId);
        if (members.has(str as Snowflake)) {
            return members.get(str as Snowflake);
        }
        return members.find(member => DiscordUtil.accentStringEqual(member.user.username, str)) || null;
    }

    public getUserFromMention(mention: string): User | null {
        const match = DiscordUtil.userMentionRegex.exec(mention);
        if (match) {
            return this.client.users.cache.get(match[1] as Snowflake) || null;
        }
        return null;
    }

    public getChannelFromMention(mention: string): Channel | null {
        const match = DiscordUtil.channelMentionRegex.exec(mention);
        if (match) {
            return this.client.channels.cache.get(match[1] as Snowflake) || null;
        }
        return null;
    }

    public getChannelFromString(str: string, guildId: Snowflake): GuildChannel | null {
        // Try mention first
        const guild = this.client.guilds.cache.get(guildId);
        const match = DiscordUtil.channelMentionRegex.exec(str);
        if (match) {
            return guild.channels.cache.get(match[1] as Snowflake) || null;
        }

        // Try channel ID then name
        if (guild.channels.cache.has(str as Snowflake)) {
            return guild.channels.cache.get(str as Snowflake);
        }
        return guild.channels.cache.find(channel => DiscordUtil.accentStringEqual(channel.name, str)) || null;
    }

    public getRoleFromString(str: string, guildId: Snowflake): Role | null {
        // Try mention first
        const guild = this.client.guilds.cache.get(guildId);
        const match = DiscordUtil.roleMentionRegex.exec(str);
        if (match) {
            return guild.roles.cache.get(match[1] as Snowflake) || null;
        }

        // Try role ID then name
        if (guild.roles.cache.has(str as Snowflake)) {
            return guild.roles.cache.get(str as Snowflake);
        }
        return guild.roles.cache.find(role => DiscordUtil.accentStringEqual(role.name, str)) || null;
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

    public async wait(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    public async handleCooldown(src: CommandSource, cooldownSet: TimedCache<string, number>): Promise<boolean> {
        if (cooldownSet) {
            const author = src.author;
            const id = author.id;
            const offenses = cooldownSet.get(id);
            if (offenses === undefined) {
                cooldownSet.set(id, 0);
            }
            else {
                if (offenses === 0) {
                    cooldownSet.update(id, 1);
                    const reply = await src.reply({ content: 'Slow down!', ephemeral: true });
                    if (reply.isMessage) {
                        await this.wait(10000);
                        await reply.delete();
                    }
                }
                else if (offenses >= 5) {
                    await this.timeoutService.timeout(author);
                }
                else {
                    cooldownSet.update(id, offenses + 1);
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