import sequelize from '../config/database.js';
import { Users } from '../models/index.js';

async function test() {
  try {
    await sequelize.authenticate();
    const admins = await Users.findAll();
    console.log('--- MASTER ADMINS IN USERS TABLE ---');
    admins.forEach((a: any) => {
      console.log(`ID: ${a.id} | Email: ${a.email} | Password: ${a.password}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
