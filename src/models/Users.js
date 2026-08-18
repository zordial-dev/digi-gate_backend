import { DataTypes } from 'sequelize';

export default function(sequelize) {
  return sequelize.define('Users', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: "users_username_key"
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: "users_email_key"
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    full_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'organisation'
    },
    organisation_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'organisations',
        key: 'id'
      }
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    otp_code: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    otp_expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'users',
    schema: 'public',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: "users_pkey",
        unique: true,
        fields: [{ name: "id" }]
      },
      {
        name: "users_username_key",
        unique: true,
        fields: [{ name: "username" }]
      },
      {
        name: "users_email_key",
        unique: true,
        fields: [{ name: "email" }]
      }
    ]
  });
}
