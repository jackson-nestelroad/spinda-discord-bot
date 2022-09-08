import { Snowflake } from 'discord.js';
import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export enum LogOptionBit {
    None = -1,
    Enabled = 1 << 0,
    MemberJoined = 1 << 1,
    MemberLeft = 1 << 2,
    MemberUpdated = 1 << 3,
    MemberBanned = 1 << 4,
    MemberUnbanned = 1 << 5,
    MessageEdited = 1 << 6,
    MessageDeleted = 1 << 7,
    BulkMessageDeletion = 1 << 8,
    Warning = 1 << 9,
}

export interface GuildAttributes {
    readonly id: Snowflake;
    prefix: string;
    logChannelId?: Snowflake;
    logOptions: number;
    timeoutPerWarning?: number;
    warnsToBeginTimeouts?: number;
    warnsToBan?: number;
}

interface GuildCreationAttributes extends Optional<GuildAttributes, 'logOptions'> {}

export class Guild extends Model<GuildAttributes, GuildCreationAttributes> implements GuildAttributes {
    public readonly id!: Snowflake;
    public prefix!: string;
    public logChannelId?: Snowflake;
    public logOptions: number;
    public warnsToBan?: number;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    public hasLogOption(option: LogOptionBit): boolean {
        return !!(this.logOptions & option);
    }

    public setLogOption(option: LogOptionBit): void {
        this.logOptions |= option;
    }

    public unsetLogOption(option: LogOptionBit): void {
        this.logOptions &= ~option;
    }

    public toggleLogOption(option: LogOptionBit): void {
        this.logOptions ^= option;
    }

    static initialize(sequelize: Sequelize) {
        Guild.init(
            {
                id: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    primaryKey: true,
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
                logOptions: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                },
                timeoutPerWarning: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                    defaultValue: null,
                },
                warnsToBeginTimeouts: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                    defaultValue: null,
                },
                warnsToBan: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                    defaultValue: 4,
                },
            },
            {
                sequelize,
                tableName: 'guilds',
            },
        );
    }
}
