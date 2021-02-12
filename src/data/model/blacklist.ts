import { Optional, Model, Sequelize, DataTypes } from 'sequelize';

export interface BlacklistEntryAttributes {
    readonly id: number;
    readonly guildId: string;
    readonly userId: string;
}

interface BlacklistEntryCreationAttributes extends Optional<BlacklistEntryAttributes, 'id'> { };

export class BlacklistEntry extends Model<BlacklistEntryAttributes, BlacklistEntryCreationAttributes>
    implements BlacklistEntryAttributes {
    public readonly id: number;
    public readonly guildId: string;
    public readonly userId: string;
    
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static initialize(sequelize: Sequelize) {
        BlacklistEntry.init({
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
            tableName: 'blacklist',
        });
    }
}