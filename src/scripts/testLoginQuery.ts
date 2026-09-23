import sequelize from '../config/database.js';
import { Organisations, Users } from '../models/index.js';

async function testLoginQuery() {
  try {
    await sequelize.authenticate();
    console.log('Testing Organisations query...');
    const org = await Organisations.findOne({
      where: { email: 'info@zordial.com' }
    });
    console.log('Org query success:', org ? { id: org.id, name: org.name, email: org.email, password: org.password } : 'Not found');

    console.log('Testing Users query...');
    const admin = await Users.findOne({
      where: { email: 'admin@digigate.com' }
    });
    console.log('Admin query success:', admin ? { id: admin.id, email: admin.email, password: admin.password } : 'Not found');

    process.exit(0);
  } catch (err) {
    console.error('Query error:', err);
    process.exit(1);
  }
}

testLoginQuery();
