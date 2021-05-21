import { Optional, Model, Sequelize, DataTypes } from 'sequelize';

export interface BlocklistEntryAttributes {
    readonly id: number;
    readonly guildId: string;
    readonly userId: string;
}

interface BlocklistEntryCreationAttributes extends Optional<BlocklistEntryAttributes, 'id'> { };

export class BlocklistEntry extends Model<BlocklistEntryAttributes, BlocklistEntryCreationAttributes>
    implements BlocklistEntryAttributes {
    public readonly id: number;
    public readonly guildId: string;
    public readonly userId: string;
    
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static initialize(sequelize: Sequelize) {
        BlocklistEntry.init({
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
            }
        }, {
            sequelize,
            tableName: 'blocklist',
        });
    }
}