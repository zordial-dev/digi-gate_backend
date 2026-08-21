import sequelize from './config/database.js';
import './models/index.js';

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');
    await sequelize.sync({ alter: true });
    console.log('Database synchronized successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Sync Error:', err);
    process.exit(1);
  }
}

run();
