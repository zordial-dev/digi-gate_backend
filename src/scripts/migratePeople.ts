import sequelize from '../config/database.js';

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');
    await sequelize.query(`
      ALTER TABLE public.people 
      ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT true;
    `);
    console.log('Migration succeeded: is_first_login column added to people table.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
