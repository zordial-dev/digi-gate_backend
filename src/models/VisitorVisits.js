const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('VisitorVisits', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    visitor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'visitors',
        key: 'id'
      }
    },
    organisation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'organisations',
        key: 'id'
      }
    },
    host_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'people',
        key: 'id'
      }
    },
    purpose_of_visit: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    reference: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    selfie_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    visit_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_DATE')
    },
    check_in_time: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    },
    host_available_at_submission: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    },
    confirmation_message: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'visitor_visits',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "visitor_visits_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
