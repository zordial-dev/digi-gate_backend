import sequelize from '../config/database';
import { Organisations } from '../models';

async function checkUser() {
  try {
    await sequelize.authenticate();
    const orgs = await Organisations.findAll();
    console.log('--- ALL ORGANISATIONS IN DB ---');
    orgs.forEach((u: any) => {
      console.log(`ID: ${u.id} | Name: "${u.name}" | Email: "${u.email}" | Password: "${u.password}" | Is Active: ${u.is_active}`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Check org error:', err);
    process.exit(1);
  }
}

checkUser();
