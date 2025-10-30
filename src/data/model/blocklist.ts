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
    public declare readonly id: number;
    public declare readonly guildId: Snowflake;
    public declare readonly userId: Snowflake;

    public declare readonly createdAt: Date;
    public declare readonly updatedAt: Date;

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
