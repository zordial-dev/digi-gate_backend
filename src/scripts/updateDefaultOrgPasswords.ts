import sequelize from '../config/database.js';

async function updateDefaultOrgPasswords() {
  try {
    await sequelize.authenticate();
    await sequelize.query(`
      UPDATE public.organisations 
      SET password = '123456' 
      WHERE password IS NULL OR password = '';
    `);
    console.log('✅ Updated default passwords (123456) for all organisations.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

updateDefaultOrgPasswords();
