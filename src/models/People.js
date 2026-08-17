const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('People', {
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
      },
      unique: "people_organisation_id_email_key"
    },
    full_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: "people_organisation_id_email_key"
    },
    mobile_number: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    designation: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    profile_pic: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    },
    available_from: {
      type: DataTypes.TIME,
      allowNull: true
    },
    available_to: {
      type: DataTypes.TIME,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    }
  }, {
    tableName: 'people',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "people_organisation_id_email_key",
        unique: true,
        fields: [
          { name: "organisation_id" },
          { name: "email" },
        ]
      },
      {
        name: "people_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
