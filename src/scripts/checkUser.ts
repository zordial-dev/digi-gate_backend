import sequelize from '../config/database';
import { Users } from '../models';

async function checkUser() {
  try {
    await sequelize.authenticate();
    const users = await Users.findAll();
    console.log('--- ALL USERS IN DB ---');
    users.forEach(u => {
      console.log(`ID: ${u.id} | Username: "${u.username}" | Email: "${u.email}" | Password: "${u.password}" | Role: "${u.role}"`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Check user error:', err);
    process.exit(1);
  }
}

checkUser();
