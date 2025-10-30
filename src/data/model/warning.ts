import { Snowflake } from 'discord.js';
import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

import { Environment } from '../environment';

export interface WarningAttributes {
    readonly id: number;
    readonly guildId: Snowflake;
    readonly userId: Snowflake;
    readonly issuerId: Snowflake;
    readonly reason: string;
    readonly date: Date;
}

interface WarningCreationAttributes extends Optional<WarningAttributes, 'id'> {}

export class Warning extends Model<WarningAttributes, WarningCreationAttributes> implements WarningAttributes {
    public declare readonly id: number;
    public declare readonly guildId: Snowflake;
    public declare readonly userId: Snowflake;
    public declare readonly issuerId: Snowflake;
    public declare readonly reason: string;
    public declare readonly date: Date;

    public declare readonly createdAt: Date;
    public declare readonly updatedAt: Date;

    static initialize(sequelize: Sequelize) {
        Warning.init(
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
                issuerId: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                reason: {
                    type: DataTypes.TEXT,
                    allowNull: false,
                },
                date: {
                    type: DataTypes.DATE,
                    allowNull: false,
                },
            },
            {
                sequelize,
                tableName: 'warnings',
            },
        );
    }
}
