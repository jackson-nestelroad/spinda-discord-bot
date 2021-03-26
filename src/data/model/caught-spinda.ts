import { Optional, Model, Sequelize, DataTypes } from 'sequelize';

export enum SpindaColorChange {
    Random = -1,
    None,
    Shiny,
    Retro,
    Gold,
    Green,
    Blue,
    Purple,
    Pink,
    Gray,
    Custom,
}

export enum SpindaFeatures {
    Random = -1,
    None = 0,
    SmallSpots = 1 << 0,
    Heart = 1 << 1,
    Star = 1 << 2,
}

export interface GeneratedSpinda {
    pid: number;
    generatedAt: Date;
    colorChange: SpindaColorChange;
    features: number;
    customColor: number;
}

export interface CaughtSpindaAttributes extends Readonly<GeneratedSpinda> {
    readonly id: number;
    readonly userId: string;
}

interface CaughtSpindaCreationAttributes extends Optional<CaughtSpindaAttributes, 'id' | 'colorChange' | 'features' | 'customColor'> { };

export class CaughtSpinda extends Model<CaughtSpindaAttributes, CaughtSpindaCreationAttributes>
    implements CaughtSpindaAttributes {
    public readonly id: number;
    public readonly userId: string;
    public readonly generatedAt: Date;
    public readonly pid: number;
    public readonly colorChange: SpindaColorChange;
    public readonly features: number;
    public readonly customColor: number;
    
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static initialize(sequelize: Sequelize) {
        CaughtSpinda.init({
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            userId: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            generatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            pid: {
                type: DataTypes.BIGINT,
                allowNull: false,
            },
            colorChange: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: SpindaColorChange.None,
            },
            features: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: SpindaFeatures.None,
            },
            customColor: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
            },
        }, {
            sequelize,
            tableName: 'caughtspindas',
        });
    }
}