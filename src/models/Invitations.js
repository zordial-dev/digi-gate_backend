export default function(sequelize, DataTypes) {
  return sequelize.define('invitations', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    invitation_code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true
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
    visitor_name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    mobile_number: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    purpose_of_visit: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    valid_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    valid_until: {
      type: DataTypes.DATE,
      allowNull: false
    },
    additional_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'active'
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    visit_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'visitor_visits',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'invitations',
    schema: 'public',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};
