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
    public readonly id: number;
    public readonly guildId: Snowflake;
    public readonly userId: Snowflake;
    public readonly issuerId: Snowflake;
    public readonly reason: string;
    public readonly date: Date;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

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
