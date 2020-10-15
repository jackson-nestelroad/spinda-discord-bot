import { Guild, GuildAttributes } from './model/guild';
import { Sequelize } from 'sequelize';
import { Environment } from './environment';
import { exit } from 'process';
import { CustomCommand } from './model/custom-command';

type Dictionary<T> = { [key: string]: T };
type ReadonlyDictionary<T> = { readonly[key: string]: T };

export class DataService {
    public readonly defaultPrefix: string = '>';

    private sequelize: Sequelize;
    private guilds = Guild;
    private customCommands = CustomCommand;

    private cache = {
        guilds: new Map<string, GuildAttributes>(),
        customCommands: new Map<string, Dictionary<string>>(),
    } as const;

    constructor() {
        this.sequelize = new Sequelize(Environment.getDatabaseUrl(), { 
            logging: false
        });
    }

    public async initialize() {
        try {
            await this.sequelize.authenticate();
        } catch (error) {
            console.error(`Unable to connect to database: ${error.message || error}`);
            exit(1);
        }

        this.guilds.initialize(this.sequelize);
        this.customCommands.initialize(this.sequelize);

        // TODO: Set up migrations
        this.sequelize.sync({ alter: true });
    }

    public async clearCache() {
        this.cache.guilds.clear();
    }

    private async getGuildModel(id: string): Promise<Guild> {
        let entry = await this.guilds.findOne({ where: { id: id }});
        if (entry === null) {
            entry = await this.guilds.create({
                id: id,
                prefix: this.defaultPrefix,
            });
        }
        return entry;
    }

    public async getGuild(id: string): Promise<GuildAttributes> {
        if (!this.cache.guilds.has(id)) {
            const model = await this.getGuildModel(id);
            this.cache.guilds.set(id, model.get());
        }
        return this.cache.guilds.get(id);
    }

    public async updateGuild(guild: GuildAttributes): Promise<void> {
        const updated = (await this.guilds.upsert(guild))[0];
        this.cache.guilds.set(updated.id, updated.get());
    }

    private async getCustomCommandModels(guildId: string): Promise<CustomCommand[]> {
        let entries = await this.customCommands.findAll({ where: { guildId: guildId }});
        return entries;
    }

    public async getCustomCommands(guildId: string): Promise<ReadonlyDictionary<string>> {
        if (!this.cache.customCommands.has(guildId)) {
            const models = await this.getCustomCommandModels(guildId);
            const map: Dictionary<string> = { };
            for (const model of models) {
                map[model.name] = model.message;
            }
            this.cache.customCommands.set(guildId, map);
        }
        return this.cache.customCommands.get(guildId);
    }

    public async setCustomCommand(guildId: string, name: string, message: string): Promise<void> {
        const updated = (await this.customCommands.upsert({ guildId, name, message }))[0];
        if (!this.cache.customCommands.has(guildId)) {
            this.cache.customCommands.set(guildId, { [updated.name]: updated.message });
        }
        else {
            this.cache.customCommands.get(guildId)[updated.name] = updated.message;
        }
    }

    public async removeCustomCommand(guildId: string, name: string): Promise<boolean> {
        const removed = (await this.customCommands.destroy({ where: { guildId: guildId, name: name }})) === 1;
        if (removed) {
            delete this.cache.customCommands.get(guildId)[name];
        }
        return removed;
    }
}