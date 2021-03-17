import { GuildMember, Collection } from 'discord.js';
import { TimedCache } from '../util/timed-cache';
import { BaseService } from './base';

export class MemberListService extends BaseService {
    private readonly cache: TimedCache<string, Collection<string, GuildMember>> = new TimedCache({ minutes: 30 });

    private async fetchMemberListForGuild(id: string): Promise<Collection<string, GuildMember>> {
        const guild = this.bot.client.guilds.cache.get(id);
        if (!guild) {
            throw new Error(`Guild ${id} could not be found.`);
        }
        const members = await guild.members.fetch();
        this.cache.set(id, members);
        return members;
    }

    public async getMemberListForGuild(id: string): Promise<Collection<string, GuildMember>> {
        return this.cache.get(id) ?? await this.fetchMemberListForGuild(id);
    }
}