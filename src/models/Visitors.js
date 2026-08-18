import { DataTypes } from 'sequelize';

export default function(sequelize) {
  return sequelize.define('Visitors', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    organisation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'organisations',
        key: 'id'
      }
    },
    full_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    designation: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    company: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    location: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    linkedin: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    mobile_number: {
      type: DataTypes.STRING(15),
      allowNull: false,
      unique: "visitors_mobile_number_key"
    }
  }, {
    tableName: 'visitors',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "visitors_mobile_number_key",
        unique: true,
        fields: [
          { name: "mobile_number" },
        ]
      },
      {
        name: "visitors_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
}
