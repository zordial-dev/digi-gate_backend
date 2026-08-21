import sequelize from '../config/database';
import { Users } from '../models';
import bcrypt from 'bcryptjs';

async function testAuthDirect() {
  try {
    await sequelize.authenticate();
    const email = 'admin@digigate.com';
    const password = '123456';

    const user = await Users.findOne({
      where: { email: email.trim() }
    });

    console.log('Found user:', user ? { id: user.id, email: user.email, dbPassword: user.password } : 'NONE');

    if (user) {
      const cleanReqPassword = String(password).trim();
      const cleanDbPassword = String(user.password).trim();
      const isDirectMatch = cleanReqPassword === cleanDbPassword || password === user.password;
      const isLegacyHashMatch = user.password && user.password.startsWith('$2') 
        ? await bcrypt.compare(cleanReqPassword, user.password).catch(() => false) 
        : false;

      console.log('isDirectMatch:', isDirectMatch);
      console.log('isLegacyHashMatch:', isLegacyHashMatch);
      console.log('MATCH RESULT:', isDirectMatch || isLegacyHashMatch);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testAuthDirect();
