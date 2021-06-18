import { GuildMember, Collection, Snowflake } from 'discord.js';
import { TimedCache } from '../util/timed-cache';
import { BaseService } from './base';

export class MemberListService extends BaseService {
    private readonly cache: TimedCache<Snowflake, Collection<Snowflake, GuildMember>> = new TimedCache({ minutes: 30 });

    private async fetchMemberListForGuild(id: Snowflake): Promise<Collection<Snowflake, GuildMember>> {
        const guild = this.bot.client.guilds.cache.get(id);
        if (!guild) {
            throw new Error(`Guild ${id} could not be found.`);
        }
        const members = await guild.members.fetch();
        this.cache.set(id, members);
        return members;
    }

    public async getMemberListForGuild(id: Snowflake): Promise<Collection<Snowflake, GuildMember>> {
        return this.cache.get(id) ?? await this.fetchMemberListForGuild(id);
    }
}