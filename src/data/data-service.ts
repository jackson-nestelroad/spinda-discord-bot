import { Guild, GuildAttributes } from './model/guild';
import { Sequelize, Options } from 'sequelize';
import { Environment } from './environment';
import { exit } from 'process';
import { CustomCommand } from './model/custom-command';
import { BlacklistEntry } from './model/blacklist';
import { CaughtSpinda, CaughtSpindaAttributes, GeneratedSpinda } from './model/caught-spinda';

export class DataService {
    public static readonly defaultPrefix: string = '>';

    private sequelize: Sequelize;
    private guilds = Guild;
    private customCommands = CustomCommand;
    private blacklist = BlacklistEntry;
    private caughtSpindas = CaughtSpinda;

    private cache = {
        guilds: new Map<string, GuildAttributes>(),
        customCommands: new Map<string, Dictionary<string>>(),
        blacklist: new Map<string, Set<string>>(),
        caughtSpindas: new Map<string, CaughtSpindaAttributes | null>(),
    } as const;

    constructor() {
        const options: Options = {
            logging: false,
        };

        if (Environment.getEnvironment() === 'production') {
            options.dialectOptions = {
                ssl: {
                    require: true,
                    rejectUnauthorized: false,
                }
            };
        }
        this.sequelize = new Sequelize(Environment.getDatabaseUrl(), options);
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
        this.blacklist.initialize(this.sequelize);
        this.caughtSpindas.initialize(this.sequelize);

        // TODO: Set up migrations
        await this.sequelize.sync({ alter: true });
    }

    public clearCache() {
        this.cache.guilds.clear();
        this.cache.customCommands.clear();
        this.cache.blacklist.clear();
        this.cache.caughtSpindas.clear();
    }

    private async getGuildModel(id: string): Promise<Guild> {
        let entry = await this.guilds.findOne({ where: { id }});
        if (entry === null) {
            entry = await this.guilds.create({
                id,
                prefix: DataService.defaultPrefix,
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
        let entries = await this.customCommands.findAll({ where: { guildId }});
        return entries;
    }

    private async assureCustomCommandsCache(guildId: string) {
        if (!this.cache.customCommands.has(guildId)) {
            const models = await this.getCustomCommandModels(guildId);
            const map: Dictionary<string> = { };
            for (const model of models) {
                map[model.name] = model.message;
            }
            this.cache.customCommands.set(guildId, map);
        }
    }

    public async getCustomCommands(guildId: string): Promise<ReadonlyDictionary<string>> {
        await this.assureCustomCommandsCache(guildId);
        return this.cache.customCommands.get(guildId);
    }

    public async setCustomCommand(guildId: string, name: string, message: string): Promise<void> {
        await this.assureCustomCommandsCache(guildId);
        const map = this.cache.customCommands.get(guildId);
        if (map[name]) {
            await this.customCommands.update({ message }, { where: { guildId, name } });
        }
        else {
            await this.customCommands.create({ guildId, name, message });
        }
        map[name] = message;
    }

    public async removeCustomCommand(guildId: string, name: string): Promise<boolean> {
        await this.assureCustomCommandsCache(guildId);
        const removed = (await this.customCommands.destroy({ where: { guildId, name }})) !== 0;
        delete this.cache.customCommands.get(guildId)[name];
        return removed;
    }

    private async getBlacklistModels(guildId: string): Promise<BlacklistEntry[]> {
        let entries = await this.blacklist.findAll({ where: { guildId }});
        return entries;
    }

    private async assureBlacklistCache(guildId: string) {
        if (!this.cache.blacklist.has(guildId)) {
            const models = await this.getBlacklistModels(guildId);
            const set: Set<string> = new Set();
            for (const model of models) {
                set.add(model.userId);
            }
            this.cache.blacklist.set(guildId, set);
        }
    }

    public async getBlacklist(guildId: string): Promise<ReadonlySet<string>> {
        await this.assureBlacklistCache(guildId);
        return this.cache.blacklist.get(guildId);
    }

    public async addToBlacklist(guildId: string, userId: string): Promise<void> {
        await this.assureBlacklistCache(guildId);
        const list = this.cache.blacklist.get(guildId);
        if (!list.has(userId)) {
            await this.blacklist.create({ guildId, userId });
            list.add(userId);
        }
    }

    public async removeFromBlacklist(guildId: string, userId: string): Promise<boolean> {
        await this.assureBlacklistCache(guildId);
        const removed = (await this.blacklist.destroy({ where: { guildId, userId }})) !== 0;
        this.cache.blacklist.get(guildId).delete(userId);
        return removed;
    }

    private async getCaughtSpindaModel(userId: string): Promise<CaughtSpinda | null> {
        return await this.caughtSpindas.findOne({ where: { userId }});
    }

    public async getCaughtSpinda(userId: string): Promise<CaughtSpindaAttributes | null> {
        if (!this.cache.caughtSpindas.has(userId)) {
            const model = await this.getCaughtSpindaModel(userId);
            this.cache.caughtSpindas.set(userId, model?.get() ?? null);
        }
        return this.cache.caughtSpindas.get(userId);
    }

    public async catchSpinda(userId: string, spinda: GeneratedSpinda): Promise<void> {
        const updated = (await this.caughtSpindas.upsert({ userId, ...spinda, }))[0];
        this.cache.caughtSpindas.set(updated.userId, updated.get());
    }
}