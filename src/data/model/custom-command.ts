import { Optional, Model, Sequelize, DataTypes } from 'sequelize';

export interface CustomCommandAttributes {
    readonly id: number;
    readonly guildId: string;
    name: string;
    message: string;
}

interface CustomCommandCreationAttributes extends Optional<CustomCommandAttributes, 'id'> { };

export class CustomCommand extends Model<CustomCommandAttributes, CustomCommandCreationAttributes>
    implements CustomCommandAttributes {
    public readonly id: number;
    public readonly guildId: string;
    public name: string;
    public message: string;
    
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
        }, {
            sequelize,
            tableName: 'customcommands',
        });
    }
}