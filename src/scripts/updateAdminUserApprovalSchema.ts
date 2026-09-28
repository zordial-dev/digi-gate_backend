import sequelize from '../config/database.js';

async function updateSchema() {
  try {
    console.log('--- Updating Admin Users Schema (is_approved, is_blocked) ---');

    // 1. Add is_approved and is_blocked columns to users table
    await sequelize.query(`
      ALTER TABLE public.users 
      ADD COLUMN IF NOT EXISTS is_approved INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
    `);
    console.log('✅ Added is_approved and is_blocked columns to public.users.');

    // 2. Mark existing active users as approved (is_approved = 1) and unblocked (is_blocked = false)
    await sequelize.query(`
      UPDATE public.users 
      SET is_approved = 1, is_blocked = false
      WHERE is_active = true OR email = 'admin@digigate.com';
    `);
    console.log('✅ Set is_approved = 1 and is_blocked = false for active admin users.');

    console.log('--- Migration Completed Successfully ---');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration Failed:', error);
    process.exit(1);
  }
}

updateSchema();
