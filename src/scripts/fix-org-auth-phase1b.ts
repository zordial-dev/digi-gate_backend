/**
 * fix-org-auth-phase1b.ts
 *
 * - Drops password column from organisations (if still exists)
 * - Adds email column to organisations (if missing)
 * - Adds 'super_admin' to organisation_user_role ENUM (if missing)
 * - Updates all existing organisation_users rows to role='super_admin'
 * - Back-fills organisations.email from organisation_users.email where missing
 *
 * Run: npx tsx src/scripts/fix-org-auth-phase1b.ts
 */

import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

async function run() {
  await sequelize.authenticate();
  console.log('✅ Connected.\n');

  // 1. Drop password from organisations if still there
  const [{ has_pass }] = await sequelize.query(
    `SELECT COUNT(*) > 0 AS has_pass FROM information_schema.columns
     WHERE table_schema='public' AND table_name='organisations' AND column_name='password'`,
    { type: QueryTypes.SELECT }
  ) as any[];
  if (has_pass) {
    await sequelize.query(`ALTER TABLE public.organisations DROP COLUMN IF EXISTS password`);
    console.log('🗑️  Dropped password column from organisations.');
  } else {
    console.log('✅ password column already absent from organisations.');
  }

  // 2. Add email column to organisations if missing
  const [{ has_email }] = await sequelize.query(
    `SELECT COUNT(*) > 0 AS has_email FROM information_schema.columns
     WHERE table_schema='public' AND table_name='organisations' AND column_name='email'`,
    { type: QueryTypes.SELECT }
  ) as any[];
  if (!has_email) {
    await sequelize.query(`ALTER TABLE public.organisations ADD COLUMN email VARCHAR(100) NULL`);
    console.log('✅ Added email column to organisations.');
  } else {
    console.log('✅ email column already present in organisations.');
  }

  // 3. Add super_admin to ENUM if missing
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TYPE public.organisation_user_role ADD VALUE IF NOT EXISTS 'super_admin';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  console.log('✅ super_admin ENUM value ensured.');

  // 4. Update all existing organisation_users to super_admin
  const [, meta] = await sequelize.query(
    `UPDATE public.organisation_users SET role = 'super_admin' WHERE role = 'admin'`,
    { type: QueryTypes.RAW }
  );
  console.log(`✅ Updated existing organisation_users rows to super_admin (${(meta as any)?.rowCount ?? '?'} rows).`);

  // 5. Back-fill organisations.email from organisation_users where null
  const [, meta2] = await sequelize.query(
    `UPDATE public.organisations o
     SET email = ou.email
     FROM public.organisation_users ou
     WHERE ou.organisation_id = o.id AND (o.email IS NULL OR o.email = '')`,
    { type: QueryTypes.RAW }
  );
  console.log(`✅ Back-filled organisations.email from organisation_users (${(meta2 as any)?.rowCount ?? '?'} rows).`);

  console.log('\n🎉 Fix complete. Restart the backend server.');
  process.exit(0);
}

run().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
