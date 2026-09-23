import sequelize from '../config/database';
import { Organisations } from '../models';

async function testAuthDirect() {
  try {
    await sequelize.authenticate();
    const email = 'info@zordial.com';
    const password = '123456';

    const org = await Organisations.findOne({
      where: { email: email.trim() }
    });

    console.log('Found org:', org ? { id: org.id, email: org.email, dbPassword: org.password } : 'NONE');

    if (org) {
      const cleanReqPassword = String(password).trim();
      const cleanDbPassword = String(org.password).trim();
      const isDirectMatch = cleanReqPassword === cleanDbPassword;
      console.log('isDirectMatch:', isDirectMatch);
    }
    process.exit(0);
  } catch (err) {
    console.error('Test auth error:', err);
    process.exit(1);
  }
}

testAuthDirect();
