import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

import { GeneratedSpindaData } from '../../commands/lib/spinda/util/spinda';
import { Snowflake } from 'discord.js';

export interface CaughtSpindaAttributes extends Readonly<GeneratedSpindaData> {
    readonly id: number;
    readonly userId: Snowflake;
    readonly position: number;
}

interface CaughtSpindaCreationAttributes
    extends Optional<CaughtSpindaAttributes, 'id' | 'features'> { }

export class CaughtSpinda
    extends Model<CaughtSpindaAttributes, CaughtSpindaCreationAttributes>
    implements CaughtSpindaAttributes {
    public readonly id: number;
    public readonly userId: Snowflake;
    public readonly position: number;
    public readonly generatedAt: Date;
    public readonly pid: number;
    public readonly features: bigint;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static initialize(sequelize: Sequelize) {
        CaughtSpinda.init(
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                },
                userId: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    unique: false,
                },
                position: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    unique: false,
                    defaultValue: 0,
                },
                generatedAt: {
                    type: DataTypes.DATE,
                    allowNull: false,
                },
                pid: {
                    type: DataTypes.BIGINT,
                    allowNull: false,
                },
                features: {
                    type: DataTypes.BIGINT,
                    allowNull: false,
                },
            },
            {
                sequelize,
                tableName: 'caughtspindas',
            },
        );
    }
}
