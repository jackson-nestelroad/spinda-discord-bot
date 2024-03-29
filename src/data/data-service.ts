import { Snowflake } from 'discord.js';
import { BaseService } from 'panda-discord';
import { exit } from 'process';
import { Options, Sequelize } from 'sequelize';

import { SpindaDiscordBot } from '../bot';
import { GeneratedSpindaData } from '../commands/lib/spinda/util/spinda';
import { Environment } from './environment';
import { BlocklistEntry } from './model/blocklist';
import { CaughtSpinda, CaughtSpindaAttributes } from './model/caught-spinda';
import { CustomCommand, CustomCommandData } from './model/custom-command';
import { Guild, GuildAttributes } from './model/guild';
import { Warning, WarningAttributes } from './model/warning';

export class DataService extends BaseService<SpindaDiscordBot> {
    public static readonly defaultPrefix: string = '>';

    private sequelize: Sequelize;
    private guilds = Guild;
    private customCommands = CustomCommand;
    private blocklist = BlocklistEntry;
    private caughtSpindas = CaughtSpinda;
    private warnings = Warning;

    private cache = {
        guilds: new Map<Snowflake, GuildAttributes>(),
        customCommands: new Map<string, Dictionary<CustomCommandData>>(),
        blocklist: new Map<Snowflake, Set<Snowflake>>(),
        caughtSpindas: new Map<Snowflake, Array<CaughtSpindaAttributes>>(),
        // Warnings are not cached
    } as const;

    constructor(bot: SpindaDiscordBot) {
        super(bot);

        const options: Options = {
            logging: false,
            dialectOptions: {
                ssl:
                    Environment.getEnvironment() === 'production'
                        ? {
                              require: true,
                              rejectUnauthorized: false,
                          }
                        : undefined,
            },
        };
        this.sequelize = new Sequelize(Environment.getDatabaseUrl(), options);
    }

    public async initialize() {
        try {
            await this.sequelize.authenticate();
        } catch (error) {
            console.error(`Unable to connect to database: ${error.message || error}.`);
            exit(1);
        }

        this.guilds.initialize(this.sequelize);
        this.customCommands.initialize(this.sequelize);
        this.blocklist.initialize(this.sequelize);
        this.caughtSpindas.initialize(this.sequelize);
        this.warnings.initialize(this.sequelize);

        // TODO: Set up migrations
        await this.sequelize.sync({ alter: true });
    }

    public clearCache() {
        this.cache.guilds.clear();
        this.cache.customCommands.clear();
        this.cache.blocklist.clear();
        this.cache.caughtSpindas.clear();
    }

    private async getGuildModel(id: Snowflake): Promise<Guild> {
        let entry = await this.guilds.findOne({ where: { id } });
        if (entry === null) {
            entry = await this.guilds.create({
                id,
                prefix: DataService.defaultPrefix,
            });
        }
        return entry;
    }

    public async getGuild(id: Snowflake): Promise<GuildAttributes> {
        if (!this.cache.guilds.has(id)) {
            const model = await this.getGuildModel(id);
            this.cache.guilds.set(id, model.get());
        }
        return this.cache.guilds.get(id);
    }

    public hasGuildInCache(id: Snowflake): boolean {
        return this.cache.guilds.has(id);
    }

    public getCachedGuild(id: Snowflake): GuildAttributes {
        return this.cache.guilds.get(id);
    }

    public async updateGuild(guild: GuildAttributes): Promise<void> {
        const updated = (await this.guilds.upsert(guild))[0];
        this.cache.guilds.set(updated.id, updated.get());
    }

    private async getCustomCommandModels(guildId: Snowflake): Promise<CustomCommand[]> {
        let entries = await this.customCommands.findAll({ where: { guildId } });
        return entries;
    }

    private async assureCustomCommandsCache(guildId: Snowflake) {
        if (!this.cache.customCommands.has(guildId)) {
            const models = await this.getCustomCommandModels(guildId);
            const map: Dictionary<CustomCommandData> = {};
            for (const model of models) {
                map[model.name] = model.get();
            }
            this.cache.customCommands.set(guildId, map);
        }
    }

    public async getCustomCommands(guildId: Snowflake): Promise<ReadonlyDictionary<CustomCommandData>> {
        await this.assureCustomCommandsCache(guildId);
        return this.cache.customCommands.get(guildId);
    }

    public getCachedCustomCommands(guildId: Snowflake): ReadonlyDictionary<CustomCommandData> {
        return this.cache.customCommands.get(guildId);
    }

    public async setCustomCommand(guildId: Snowflake, data: CustomCommandData): Promise<void> {
        await this.assureCustomCommandsCache(guildId);
        const map = this.cache.customCommands.get(guildId);
        if (map[data.name]) {
            await this.customCommands.update(data, { where: { guildId, name: data.name } });
        } else {
            await this.customCommands.create({ guildId, ...data });
        }
        map[data.name] = data;
    }

    public async removeCustomCommand(guildId: Snowflake, name: string): Promise<boolean> {
        await this.assureCustomCommandsCache(guildId);
        const removed = (await this.customCommands.destroy({ where: { guildId, name } })) !== 0;
        delete this.cache.customCommands.get(guildId)[name];
        return removed;
    }

    private async getBlocklistModels(guildId: Snowflake): Promise<BlocklistEntry[]> {
        let entries = await this.blocklist.findAll({ where: { guildId } });
        return entries;
    }

    private async assureBlocklistCache(guildId: Snowflake) {
        if (!this.cache.blocklist.has(guildId)) {
            const models = await this.getBlocklistModels(guildId);
            const set: Set<Snowflake> = new Set();
            for (const model of models) {
                set.add(model.userId);
            }
            this.cache.blocklist.set(guildId, set);
        }
    }

    public async getBlocklist(guildId: Snowflake): Promise<ReadonlySet<Snowflake>> {
        await this.assureBlocklistCache(guildId);
        return this.cache.blocklist.get(guildId);
    }

    public async addToBlocklist(guildId: Snowflake, userId: Snowflake): Promise<void> {
        await this.assureBlocklistCache(guildId);
        const list = this.cache.blocklist.get(guildId);
        if (!list.has(userId)) {
            await this.blocklist.create({ guildId, userId });
            list.add(userId);
        }
    }

    public async removeFromBlocklist(guildId: Snowflake, userId: Snowflake): Promise<boolean> {
        await this.assureBlocklistCache(guildId);
        const removed = (await this.blocklist.destroy({ where: { guildId, userId } })) !== 0;
        this.cache.blocklist.get(guildId).delete(userId);
        return removed;
    }

    private async getCaughtSpindaModels(userId: Snowflake): Promise<Array<CaughtSpinda>> {
        return await this.caughtSpindas.findAll({ where: { userId }, order: [['position', 'ASC']] });
    }

    private async assureCaughtSpindaCache(userId: Snowflake): Promise<Array<CaughtSpindaAttributes>> {
        let cached = this.cache.caughtSpindas.get(userId);
        if (cached === undefined) {
            const found = await this.getCaughtSpindaModels(userId);
            cached = found.map(model => {
                return CaughtSpinda.deserializeAttributes(model.get());
            });
            this.cache.caughtSpindas.set(userId, cached);
        }
        return cached;
    }

    private async correctCaughtSpindaModels(userId: Snowflake) {
        this.cache.caughtSpindas.delete(userId);

        // Get all models for this user
        const allSavedModels = await this.getCaughtSpindaModels(userId);

        // Find models with repeated positions
        const seenPositions: Set<number> = new Set();
        let maxPositionSeen: number = 0;
        let goodModels: Array<CaughtSpinda> = [];
        let badModels: Array<CaughtSpinda> = [];

        // Find bad models, or models that duplicate a position
        for (const model of allSavedModels) {
            if (seenPositions.has(model.position)) {
                badModels.push(model);
            } else {
                if (model.position > maxPositionSeen) {
                    maxPositionSeen = model.position;
                }
                seenPositions.add(model.position);
                goodModels.push(model);
            }
        }

        // Max position is too large, redefine good and bad models based on position number
        const maxAllowedPosition = allSavedModels.length - 1;
        if (maxPositionSeen > maxAllowedPosition) {
            maxPositionSeen = maxAllowedPosition;
            goodModels = [];
            badModels = [];
            for (const model of allSavedModels) {
                if (model.position <= maxAllowedPosition) {
                    goodModels.push(model);
                } else {
                    badModels.push(model);
                }
            }
        }

        // Correct all bad models by using numbers we haven't seen before
        let i = 0;
        for (const model of badModels) {
            for (; i < allSavedModels.length; ++i) {
                // Have not seen this number before
                if (!seenPositions.has(i)) {
                    const updated = await model.update({ position: i });
                    goodModels.push(updated);
                    ++i;
                    break;
                }
            }
        }

        const cached = goodModels
            .map(model => CaughtSpinda.deserializeAttributes(model.get()))
            .sort((a, b) => a.position - b.position);
        this.cache.caughtSpindas.set(userId, cached);
    }

    public async getCaughtSpinda(userId: Snowflake): Promise<Readonly<Array<CaughtSpindaAttributes>>> {
        return this.assureCaughtSpindaCache(userId);
    }

    public async swapCaughtSpindaPositions(userId: Snowflake, first: number, second: number) {
        const firstModels = await this.caughtSpindas.findAll({ where: { userId, position: first } });
        if (firstModels.length !== 1) {
            await this.correctCaughtSpindaModels(userId);
            return this.swapCaughtSpindaPositions(userId, first, second);
        }

        const secondModels = await this.caughtSpindas.findAll({ where: { userId, position: second } });
        if (secondModels.length !== 1) {
            await this.correctCaughtSpindaModels(userId);
            return this.swapCaughtSpindaPositions(userId, first, second);
        }

        const newSecond = await firstModels[0].update({ position: second });
        const newFirst = await secondModels[0].update({ position: first });

        const collection = await this.assureCaughtSpindaCache(userId);
        collection[first] = CaughtSpinda.deserializeAttributes(newFirst.get());
        collection[second] = CaughtSpinda.deserializeAttributes(newSecond.get());
    }

    public async releaseCaughtSpinda(userId: Snowflake, pos: number) {
        await this.caughtSpindas.destroy({ where: { userId, position: pos } });
        await this.correctCaughtSpindaModels(userId);
    }

    public async catchSpinda(
        userId: Snowflake,
        spinda: GeneratedSpindaData,
        pos: number,
        allowCorrection: boolean = true,
    ): Promise<void> {
        let collection = await this.assureCaughtSpindaCache(userId);

        // Position exceeds current array
        // Add to end of array, and add new entry
        if (pos >= collection.length) {
            const model = await this.caughtSpindas.create(
                CaughtSpinda.serializeAttributes({ userId, position: pos, ...spinda }),
            );
            collection.push(CaughtSpinda.deserializeAttributes(model.get()));
        } else {
            const [numUpdated, updated] = await this.caughtSpindas.update(CaughtSpinda.serializeAttributes(spinda), {
                where: { userId, position: pos },
                returning: true,
            });

            // numUpdated should be 1
            // If it isn't, something bad happened
            // The cache may have been corrupted, so we fix the cache and database, then try again

            let model: CaughtSpinda;

            if (numUpdated !== 1) {
                if (!allowCorrection) {
                    throw new Error(
                        `Could not correct caught Spinda collection for user ID ${userId}. Database correction required.`,
                    );
                }

                await this.correctCaughtSpindaModels(userId);

                // Try to catch this Spinda again, this time not allowing correction
                if (numUpdated === 0) {
                    return this.catchSpinda(userId, spinda, pos, false);
                }
                // Not much we can do if multiple Spinda got overwritten
                else {
                    await Promise.all(updated.slice(1).map(async model => await model.destroy()));
                    model = updated[0];
                }
            } else {
                model = updated[0];
            }

            // Cache may have changed, so get updated cache
            collection = this.cache.caughtSpindas.get(userId);
            collection[pos] = CaughtSpinda.deserializeAttributes(model.get());
        }
    }

    public async getWarnings(guildId: Snowflake, userId: Snowflake): Promise<WarningAttributes[]> {
        const warnings = await this.warnings.findAll({ where: { guildId, userId }, order: [['id', 'DESC']] });
        return warnings.map(warning => warning.get());
    }

    public async countWarnings(guildId: Snowflake, userId: Snowflake): Promise<number> {
        return await this.warnings.count({ where: { guildId, userId } });
    }

    public async getWarning(id: number, guildId: Snowflake): Promise<WarningAttributes> {
        return (await this.warnings.findOne({ where: { id, guildId } }))?.get();
    }

    public async deleteWarning(id: number, guildId: Snowflake): Promise<boolean> {
        const deleted = await this.warnings.destroy({ where: { id, guildId } });
        return deleted > 0;
    }

    public async clearWarnings(guildId: Snowflake, userId: Snowflake): Promise<number> {
        return await this.warnings.destroy({ where: { guildId, userId } });
    }

    public async addWarning(
        guildId: Snowflake,
        userId: Snowflake,
        issuerId: Snowflake,
        reason: string,
    ): Promise<WarningAttributes> {
        return (await this.warnings.create({ guildId, userId, issuerId, reason, date: new Date() }))?.get();
    }
}
