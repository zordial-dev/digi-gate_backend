import sequelize from '../config/database.js';
import initModels from './init-models.js';

const models = initModels(sequelize);

export const {
  Organisations,
  People,
  VisitorVisits,
  Visitors,
  Users,
} = models;

export { sequelize };