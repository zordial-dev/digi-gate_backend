import sequelize from '../config/database.js';
import initModels from './init-models.js';

const models = initModels(sequelize);

export const {
  Organisations,
  OrganisationUsers,
  People,
  VisitorVisits,
  Visitors,
  Users,
  Roles,
} = models;

export { sequelize };