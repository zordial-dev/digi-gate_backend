import { DataTypes } from 'sequelize';
export default function (sequelize) {
    return sequelize.define('Users', {
        id: {
            autoIncrement: true,
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        password: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        role_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 2
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        is_approved: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0 // 0 = Pending, 1 = Approved, 2 = Denied
        },
        is_blocked: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false // false = Unblocked, true = Blocked
        }
    }, {
        tableName: 'users',
        schema: 'public',
        timestamps: false
    });
}
