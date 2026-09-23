import sequelize from '../config/database.js';

async function migrate() {
  try {
    console.log('--- Starting Database Migration: Users -> Organisations ---');

    // 1. Add password column to organisations table if it does not exist
    await sequelize.query(`
      ALTER TABLE public.organisations 
      ADD COLUMN IF NOT EXISTS password VARCHAR(200);
    `);
    console.log('✅ Added password column to public.organisations table.');

    // 2. Copy passwords from users table to organisations table where organisation_id matches
    try {
      await sequelize.query(`
        UPDATE public.organisations o
        SET password = u.password
        FROM public.users u
        WHERE u.organisation_id = o.id AND u.password IS NOT NULL;
      `);
      console.log('✅ Migrated existing passwords from users to organisations.');
    } catch (err: any) {
      console.log('⚠️ Could not copy passwords from users (users table may already be gone or empty):', err.message);
    }

    // 3. Set default password '123456' for any organisation without a password
    await sequelize.query(`
      UPDATE public.organisations
      SET password = '123456'
      WHERE password IS NULL OR password = '';
    `);
    console.log('✅ Set default password for any organisations missing a password.');

    // 4. Drop users table
    await sequelize.query(`
      DROP TABLE IF EXISTS public.users CASCADE;
    `);
    console.log('✅ Dropped public.users table.');

    console.log('--- Migration Completed Successfully ---');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration Failed:', error);
    process.exit(1);
  }
}

migrate();
