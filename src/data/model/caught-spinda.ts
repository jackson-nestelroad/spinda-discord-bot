import { Optional, Model, Sequelize, DataTypes } from 'sequelize';

export enum SpindaColorChange {
    None,
    Random,
    Shiny
}

export interface GeneratedSpinda {
    pid: number;
    colorChange: SpindaColorChange;
    generatedAt: Date;
}

export interface CaughtSpindaAttributes extends Readonly<GeneratedSpinda> {
    readonly id: number;
    readonly userId: string;
}

interface CaughtSpindaCreationAttributes extends Optional<CaughtSpindaAttributes, 'id' | 'colorChange'> { };

export class CaughtSpinda extends Model<CaughtSpindaAttributes, CaughtSpindaCreationAttributes>
    implements CaughtSpindaAttributes {
    public readonly id: number;
    public readonly userId: string;
    public readonly generatedAt: Date;
    public readonly pid: number;
    public readonly colorChange: SpindaColorChange;
    
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
        }, {
            sequelize,
            tableName: 'caughtspindas',
        });
    }
}