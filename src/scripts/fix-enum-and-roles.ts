/**
 * fix-enum-and-roles.ts
 *
 * 1. Find the real Postgres ENUM type name used by organisation_users.role
 * 2. Add 'super_admin' value to it
 * 3. Update all existing rows to super_admin
 * 4. Back-fill organisations.email from organisation_users
 *
 * Run: npx tsx src/scripts/fix-enum-and-roles.ts
 */

import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

async function run() {
  await sequelize.authenticate();
  console.log('✅ Connected.\n');

  // 1. Find actual enum type name for organisation_users.role
  const [enumInfo] = await sequelize.query(
    `SELECT t.typname
     FROM pg_type t
     JOIN pg_attribute a ON a.atttypid = t.oid
     JOIN pg_class c ON c.oid = a.attrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'organisation_users'
       AND a.attname = 'role'`,
    { type: QueryTypes.SELECT }
  ) as any[];

  const typeName = enumInfo?.typname;
  if (!typeName) {
    console.log('❌ Could not find ENUM type for organisation_users.role');
    process.exit(1);
  }
  console.log(`Found ENUM type: ${typeName}`);

  // 2. Check if super_admin already in the enum
  const values = await sequelize.query(
    `SELECT enumlabel FROM pg_enum e
     JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typname = $1`,
    { type: QueryTypes.SELECT, bind: [typeName] }
  ) as any[];
  const hasSuper = values.some((v: any) => v.enumlabel === 'super_admin');

  if (!hasSuper) {
    // Must run outside a transaction
    await sequelize.query(
      `ALTER TYPE "${typeName}" ADD VALUE 'super_admin' BEFORE 'admin'`
    );
    console.log('✅ Added super_admin to ENUM.');
  } else {
    console.log('✅ super_admin already in ENUM.');
  }

  // 3. Update existing rows (need a new connection after ALTER TYPE)
  await sequelize.query(
    `UPDATE public.organisation_users SET role = 'super_admin' WHERE role IN ('admin')`,
    { type: QueryTypes.RAW }
  );
  console.log('✅ All organisation_users rows set to super_admin.');

  // 4. Back-fill organisations.email
  await sequelize.query(
    `UPDATE public.organisations o
     SET email = ou.email
     FROM public.organisation_users ou
     WHERE ou.organisation_id = o.id AND (o.email IS NULL OR o.email = '')`,
    { type: QueryTypes.RAW }
  );
  console.log('✅ Back-filled organisations.email from organisation_users.');

  console.log('\n🎉 Done. Restart the backend server.');
  process.exit(0);
}

run().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
