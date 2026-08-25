import sequelize from '../config/database.js';
import { Users, Organisations } from '../models/index.js';

async function listUsers() {
  try {
    await sequelize.authenticate();
    const users = await Users.findAll({
      include: [{ model: Organisations, as: 'organisation', attributes: ['id', 'name', 'code'] }],
      order: [['id', 'ASC']]
    });

    console.log('=== DIGI-GATE ALL USER ACCOUNTS ===');
    users.forEach((u: any) => {
      console.log(`ID: ${u.id} | Role: ${u.role} | Username: ${u.username} | Email: ${u.email} | Org: ${u.organisation ? u.organisation.name + ' (ID: ' + u.organisation.id + ', Code: ' + u.organisation.code + ')' : 'None'}`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Error fetching users:', err);
    process.exit(1);
  }
}

listUsers();
