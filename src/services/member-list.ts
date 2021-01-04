import { GuildMember, Collection } from 'discord.js';
import { DiscordBot } from '../bot';

export class MemberListService {
    private readonly cache: TimedCache<string, Collection<string, GuildMember>> = new Map();
    private readonly expireAge: number = 30 * 60 * 1000; // 30 minutes
    
    public constructor(private bot: DiscordBot) { }

    private async fetchMemberListForGuild(id: string): Promise<Collection<string, GuildMember>> {
        const guild = this.bot.client.guilds.cache.get(id);
        if (!guild) {
            throw new Error(`Guild ${id} could not be found.`);
        }
        const members = await guild.members.fetch();
        this.cache.set(id, { lastFetched: new Date(), data: members });
        return members;
    }

    public async getMemberListForGuild(id: string): Promise<Collection<string, GuildMember>> {
        if (!this.cache.has(id)) {
            return await this.fetchMemberListForGuild(id);
        }
        else {
            const entry = this.cache.get(id);
            if ((new Date() as any) - (entry.lastFetched as any) > this.expireAge) {
                return await this.fetchMemberListForGuild(id);
            }
            return entry.data;
        }
    }
}