import { GuildConfig } from './model/guild-config';

export class DataService {
    // TODO: Set up some sort of database for guild-specific settings
    public getGuildConfig(guildId: string): GuildConfig {
        return { prefix: '!' };
    }
}