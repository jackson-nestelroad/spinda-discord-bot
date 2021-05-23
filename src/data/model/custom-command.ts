import { Optional, Model, Sequelize, DataTypes } from 'sequelize';

export interface CustomCommandData {
    name: string;
    message: string;
    description: string;
    contentName: string;
    contentDescription: string;
    noContent: boolean;
}

export interface CustomCommandAttributes extends CustomCommandData {
    readonly id: number;
    readonly guildId: string;
}

interface CustomCommandCreationAttributes extends Optional<CustomCommandAttributes, 'id'> { };

export class CustomCommand extends Model<CustomCommandAttributes, CustomCommandCreationAttributes>
    implements CustomCommandAttributes {
    public readonly id: number;
    public readonly guildId: string;
    public name: string;
    public message: string;
    public description: string;
    public contentName: string;
    public contentDescription: string;
    public noContent: boolean;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static initialize(sequelize: Sequelize) {
        CustomCommand.init({
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            guildId: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            message: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            contentName: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            contentDescription: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            noContent: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
            },
        }, {
            sequelize,
            tableName: 'customcommands',
        });
    }
}