import { Snowflake } from 'discord.js';
import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface BlocklistEntryAttributes {
    readonly id: number;
    readonly guildId: Snowflake;
    readonly userId: Snowflake;
}

interface BlocklistEntryCreationAttributes extends Optional<BlocklistEntryAttributes, 'id'> {}

export class BlocklistEntry
    extends Model<BlocklistEntryAttributes, BlocklistEntryCreationAttributes>
    implements BlocklistEntryAttributes
{
    public readonly id: number;
    public readonly guildId: Snowflake;
    public readonly userId: Snowflake;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static initialize(sequelize: Sequelize) {
        BlocklistEntry.init(
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                },
                guildId: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                userId: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
            },
            {
                sequelize,
                tableName: 'blocklist',
            },
        );
    }
}
