import { Guild, GuildAttributes } from './model/guild';
import { Sequelize } from 'sequelize';
import { Environment } from './environment';
import { exit } from 'process';

export class DataService {
    public readonly defaultPrefix: string = '>';

    private sequelize: Sequelize;
    private guilds = Guild;

    private cache = {
        guilds: new Map<string, GuildAttributes>(),
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

        // TODO: Set up migrations
        this.sequelize.sync({ alter: true });
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
}