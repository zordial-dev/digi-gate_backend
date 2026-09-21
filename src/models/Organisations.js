import { DataTypes } from 'sequelize';

export default function(sequelize) {
  return sequelize.define('Organisations', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "organisations_code_key"
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    pincode: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    website: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    logo_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    timezone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: "Asia/Kolkata"
    },
    host_available_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "Thank you for visiting Zordial Tech! {visitor_name}, {host_name} will be with you shortly."
    },
    host_unavailable_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "Thank you for your interest, {visitor_name}. {host_name} is currently unavailable. Kindly visit again during available timings."
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    }
  }, {
    tableName: 'organisations',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "organisations_code_key",
        unique: true,
        fields: [
          { name: "code" },
        ]
      },
      {
        name: "organisations_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
}
