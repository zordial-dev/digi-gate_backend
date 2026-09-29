import { DataTypes } from 'sequelize';

/**
 * organisation_users table
 *
 * Each row is one portal-user (currently only role='admin') for an organisation.
 * email + password live here so the organisations table stays credential-free.
 * Phase 2 will add sub_admin rows via an invite flow.
 */
export default function (sequelize) {
  return sequelize.define('OrganisationUsers', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    organisation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'organisations',
        key: 'id',
      },
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('super_admin', 'admin', 'sub_admin'),
      allowNull: false,
      defaultValue: 'super_admin',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  }, {
    tableName: 'organisation_users',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: 'organisation_users_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
      {
        // email must be unique globally so two orgs can't share the same login
        name: 'organisation_users_email_key',
        unique: true,
        fields: [{ name: 'email' }],
      },
    ],
  });
}
