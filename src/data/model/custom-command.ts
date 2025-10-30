import { Snowflake } from 'discord.js';
import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

import { CommandPermission } from '../../bot';

export enum CustomCommandFlag {
    None = 0,
    NoContent = 1 << 0,
    ContentRequired = 1 << 1,
    EnableSlash = 1 << 2,
}

export interface CustomCommandData {
    name: string;
    message: string;
    description: string;
    contentName: string;
    contentDescription: string;
    permission: keyof typeof CommandPermission;
    flags: number;
}

export interface CustomCommandAttributes extends CustomCommandData {
    readonly id: number;
    readonly guildId: Snowflake;
}

interface CustomCommandCreationAttributes extends Optional<CustomCommandAttributes, 'id'> {}

export class CustomCommand
    extends Model<CustomCommandAttributes, CustomCommandCreationAttributes>
    implements CustomCommandAttributes
{
    public declare readonly id: number;
    public declare readonly guildId: Snowflake;
    public declare name: string;
    public declare message: string;
    public declare description: string;
    public declare contentName: string;
    public declare contentDescription: string;
    public declare permission: keyof typeof CommandPermission;
    public declare flags: number;

    public declare readonly createdAt: Date;
    public declare readonly updatedAt: Date;

    static initialize(sequelize: Sequelize) {
        CustomCommand.init(
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
                permission: {
                    type: DataTypes.TEXT,
                    allowNull: false,
                    defaultValue: 'Everyone',
                },
                flags: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: CustomCommandFlag.None,
                },
            },
            {
                sequelize,
                tableName: 'customcommands',
            },
        );
    }
}
