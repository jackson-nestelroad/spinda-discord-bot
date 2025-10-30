import { Snowflake } from 'discord.js';
import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

import { GeneratedSpindaData } from '../../commands/lib/spinda/util/spinda';

type SerializedGeneratedSpindaData = Omit<GeneratedSpindaData, 'pid' | 'features'> & { pid: string; features: string };

interface CaughtSpindaData {
    id: number;
    userId: Snowflake;
    position: number;
}

export interface SerializedCaughtSpindaAttributes
    extends Readonly<CaughtSpindaData>,
        Readonly<SerializedGeneratedSpindaData> {}

export interface CaughtSpindaAttributes extends Readonly<CaughtSpindaData>, Readonly<GeneratedSpindaData> {}

interface SerializedCaughtSpindaCreationAttributes extends Optional<SerializedCaughtSpindaAttributes, 'id'> {}

interface CaughtSpindaCreationAttributes extends Optional<CaughtSpindaAttributes, 'id'> {}

export class CaughtSpinda
    extends Model<SerializedCaughtSpindaAttributes, SerializedCaughtSpindaCreationAttributes>
    implements SerializedCaughtSpindaAttributes
{
    public declare readonly id: number;
    public declare readonly userId: Snowflake;
    public declare readonly position: number;
    public declare readonly generatedAt: Date;
    public declare readonly pid: string;
    public declare readonly features: string;

    public declare readonly createdAt: Date;
    public declare readonly updatedAt: Date;

    public static serializeAttributes(attrs: CaughtSpindaAttributes): SerializedCaughtSpindaAttributes;
    public static serializeAttributes(attrs: GeneratedSpindaData): SerializedGeneratedSpindaData;
    public static serializeAttributes(attrs: CaughtSpindaCreationAttributes): SerializedCaughtSpindaCreationAttributes;

    public static serializeAttributes<T extends GeneratedSpindaData>(attrs: T): object {
        return {
            ...attrs,
            pid: attrs.pid.toString(),
            features: attrs.features.toString(),
        };
    }

    static deserializeAttributes(attrs: SerializedCaughtSpindaAttributes): CaughtSpindaAttributes {
        return {
            ...attrs,
            pid: Number(attrs.pid),
            features: BigInt(attrs.features),
        };
    }

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
                indexes: [
                    {
                        unique: true,
                        fields: ['userId', 'position'],
                    },
                ],
            },
        );
    }
}
