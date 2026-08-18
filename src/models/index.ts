import sequelize from '../config/database.js';
// Use require for CommonJS module
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const initModels = require('./init-models.js');

const models = initModels(sequelize);

export const {
  Organisations,
  People,
  VisitorVisits,
  Visitors,
  Users,
} = models;

export { sequelize };