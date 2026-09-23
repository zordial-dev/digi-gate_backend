import sequelize from '../config/database.js';

async function setupRolesAndUsers() {
  try {
    console.log('--- Setting up Roles and Admin Users Table ---');

    // 1. Create roles table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL
      );
    `);
    console.log('✅ Created public.roles table.');

    // 2. Insert default roles (1 = Super Admin, 2 = Admin)
    await sequelize.query(`
      INSERT INTO public.roles (id, name)
      VALUES (1, 'Super Admin'), (2, 'Admin')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    `);
    console.log('✅ Inserted roles: 1 = Super Admin, 2 = Admin.');

    // 3. Update users table with role_id and is_active columns
    await sequelize.query(`
      ALTER TABLE public.users 
      ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES public.roles(id) DEFAULT 2,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `);
    console.log('✅ Added role_id and is_active columns to public.users.');

    // 4. Ensure default super admin has role_id = 1
    await sequelize.query(`
      INSERT INTO public.users (email, password, role_id, is_active)
      VALUES ('admin@digigate.com', 'admin', 1, true)
      ON CONFLICT (email) 
      DO UPDATE SET role_id = 1, is_active = true;
    `);
    console.log('✅ Seeded super admin: admin@digigate.com (role_id = 1).');

    console.log('--- Migration Completed Successfully ---');
    process.exit(0);
  } catch (error) {
    console.error('❌ Setup Failed:', error);
    process.exit(1);
  }
}

setupRolesAndUsers();
