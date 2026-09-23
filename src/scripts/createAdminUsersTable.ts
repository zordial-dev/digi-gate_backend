import sequelize from '../config/database.js';

async function setupUsersTable() {
  try {
    console.log('--- Setting Up Minimal Users Table for Admins ---');

    // 1. Drop existing users table if any
    await sequelize.query(`DROP TABLE IF EXISTS public.users CASCADE;`);

    // 2. Create minimal users table with 3 columns: id, email, password
    await sequelize.query(`
      CREATE TABLE public.users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(200) NOT NULL
      );
    `);
    console.log('✅ Created public.users table with (id, email, password).');

    // 3. Insert default master admin
    await sequelize.query(`
      INSERT INTO public.users (email, password)
      VALUES ('admin@digigate.com', 'admin');
    `);
    console.log('✅ Inserted default master admin: admin@digigate.com / admin');

    console.log('--- Setup Completed Successfully ---');
    process.exit(0);
  } catch (error) {
    console.error('❌ Setup Failed:', error);
    process.exit(1);
  }
}

setupUsersTable();
