import sequelize from '../config/database.js';
import { Organisations } from '../models/index.js';

async function listUsers() {
  try {
    await sequelize.authenticate();
    const orgs = await Organisations.findAll({
      order: [['id', 'ASC']]
    });

    console.log('=== DIGI-GATE ALL ORGANISATIONS ===');
    orgs.forEach((u: any) => {
      console.log(`ID: ${u.id} | Name: ${u.name} | Code: ${u.code} | Email: ${u.email} | Active: ${u.is_active} | Approved: ${u.is_approved}`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Error fetching orgs:', err);
    process.exit(1);
  }
}

listUsers();
