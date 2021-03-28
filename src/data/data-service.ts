import { Guild, GuildAttributes } from './model/guild';
import { Sequelize, Options, Model } from 'sequelize';
import { Environment } from './environment';
import { exit } from 'process';
import { CustomCommand } from './model/custom-command';
import { BlacklistEntry } from './model/blacklist';
import { CaughtSpinda, CaughtSpindaAttributes, GeneratedSpinda } from './model/caught-spinda';
import { BaseService } from '../services/base';
import { DiscordBot } from '../bot';

export class DataService extends BaseService {
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
        caughtSpindas: new Map<string, Array<CaughtSpindaAttributes>>(),
    } as const;

    constructor(bot: DiscordBot) {
        super(bot);
        
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

    private async getCaughtSpindaModels(userId: string): Promise<Array<CaughtSpinda>> {
        return await this.caughtSpindas.findAll({ where: { userId }, order: [['position', 'ASC']] });
    }

    private async assureCaughtSpindaCache(userId: string): Promise<Array<CaughtSpindaAttributes>> {
        let cached = this.cache.caughtSpindas.get(userId);
        if (cached === undefined) {
            const found = await this.getCaughtSpindaModels(userId);
            cached = found.map(model => model.get());
            this.cache.caughtSpindas.set(userId, cached);
            return cached;
        }
        return cached;
    }

    private async correctCaughtSpindaModels(userId: string) {
        this.cache.caughtSpindas.delete(userId);

        // Get all models for this user
        const allSavedModels = await this.getCaughtSpindaModels(userId);

        // Find models with repeated positions
        const seenPositions: Set<number> = new Set();
        let maxPositionSeen: number = 0;
        const goodModels: Array<CaughtSpinda> = [];
        const badModels: Array<CaughtSpinda> = [];

        for (const model of allSavedModels) {
            if (seenPositions.has(model.position)) {
                badModels.push(model);
            }
            else {
                if (model.position > maxPositionSeen) {
                    maxPositionSeen = model.position;
                }
                seenPositions.add(model.position);
                goodModels.push(model);
            }
        }

        // Some number(s) between 0 and the maximum position is missing
        // No need to delete models, just correct the numbering!
        if (allSavedModels.length <= maxPositionSeen + 1) {
            let i = 0;
            for (const model of badModels) {
                for (; i <= maxPositionSeen; ++i) {
                    // Have not seen this number before
                    if (!seenPositions.has(i)) {
                        await model.update({ position: i });
                        ++i;
                        break;
                    }
                }
            }

            // Correct cache
            const cached = allSavedModels.map(model => model.get()).sort((a, b) => a.position - b.position);
            this.cache.caughtSpindas.set(userId, cached);
        }
        else {
            // Destroy all bad models
            for (const model of badModels) {
                await model.destroy();
            }

            const cached: Array<CaughtSpindaAttributes> = [];
            // Correct all good models
            for (let i = 0; i < goodModels.length; ++i) {
                const model = goodModels[i];
                const [num, updated] = await this.caughtSpindas.update({ position: i }, { where: { id: model.id }});
                // num is surely 0 or 1, because id is a primary key
                cached.push(num === 0 ? model.get() : updated[0].get());
            }

            // Cache for this user should be corrected
            this.cache.caughtSpindas.set(userId, cached);
        }
    }

    public async getCaughtSpinda(userId: string): Promise<Readonly<Array<CaughtSpindaAttributes>>> {
        return this.assureCaughtSpindaCache(userId);
    }

    public async swapCaughtSpindaPositions(userId: string, first: number, second: number) {
        const firstModels = await this.caughtSpindas.findAll({ where: { userId, position: first }});
        if (firstModels.length !== 1) {
            await this.correctCaughtSpindaModels(userId);
            return this.swapCaughtSpindaPositions(userId, first, second);
        }

        const secondModels = await this.caughtSpindas.findAll({ where: { userId, position: second }});
        if (secondModels.length !== 1) {
            await this.correctCaughtSpindaModels(userId);
            return this.swapCaughtSpindaPositions(userId, first, second);
        }


        const newSecond = await firstModels[0][first].update({ position: second });
        const newFirst = await secondModels[0][second].update({ position: first });

        const collection = await this.assureCaughtSpindaCache(userId);
        collection[first] = newFirst.get();
        collection[second] = newSecond.get();
    }

    public async releaseCaughtSpinda(userId: string, pos: number) {
        await this.caughtSpindas.destroy({ where: { userId, position: pos }});
        await this.correctCaughtSpindaModels(userId);
    }

    public async catchSpinda(userId: string, spinda: GeneratedSpinda, pos: number, allowCorrection: boolean = true): Promise<void> {
        const collection = await this.assureCaughtSpindaCache(userId);
        
        let model: CaughtSpinda;

        // Position exceeds current array
        // Add to end of array, and add new entry
        if (pos >= collection.length) {
            pos = collection.length;
            ++collection.length;

            model = await this.caughtSpindas.create({ userId, position: pos, ...spinda });
        }
        else {
            const [numUpdated, updated] = await this.caughtSpindas.update(spinda, { where: { userId, position: pos }, returning: true });
            
            // numUpdated should be 1
            // If it isn't, something bad happened
            // The cache may have been corrupted, so we fix the cache and database, then try again

            if (numUpdated !== 1) {
                if (!allowCorrection) {
                    throw new Error(`Could not correct caught Spinda collection for user ID ${userId}. Database correction required.`);
                }

                await this.correctCaughtSpindaModels(userId);

                // Try to catch this Spinda again, this time not allowing correction
                if (numUpdated === 0) {
                    return this.catchSpinda(userId, spinda, pos, false);
                }
                // Not much we can do if multiple Spinda got overwritten
                else {
                    await Promise.all(updated.slice(1).map(async (model) => await model.destroy()));
                    model = updated[0];
                }
            }
            else {
                model = updated[0];
            }
        }

        // Update cache at the given position
        collection[pos] = model.get();
    }
}