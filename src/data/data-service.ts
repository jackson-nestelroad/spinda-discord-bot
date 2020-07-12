import { GuildConfig } from './model/guild-config';

export class DataService {
    public readonly defaultPrefix: string = '>';

    // TODO: Set up some sort of database for guild-specific settings
    public getGuildConfig(guildId: string): GuildConfig {
        return { prefix: this.defaultPrefix };
    }
}