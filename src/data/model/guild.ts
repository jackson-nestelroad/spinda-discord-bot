import { Model, Sequelize, DataTypes, Optional } from 'sequelize';

export interface GuildAttributes {
    readonly internalId: number;
    readonly id: string;
    prefix: string;
    logChannelId?: string;
    logDeletedMessages: boolean;
}

interface GuildCreationAttributes extends Optional<GuildAttributes, 'internalId' |'logDeletedMessages'> { };

export class Guild extends Model<GuildAttributes, GuildCreationAttributes> implements GuildAttributes {
    public readonly internalId!: number;
    public readonly id!: string;
    public prefix!: string;
    public logChannelId?: string;
    public logDeletedMessages: boolean;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static initialize(sequelize: Sequelize) {
        Guild.init({
            internalId: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            id: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            prefix: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            logChannelId: {
                type: DataTypes.STRING,
                allowNull: true,
                defaultValue: null,
            },
            logDeletedMessages: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        }, {
            sequelize,
            tableName: 'guilds'
        });
    }
}