/**
 * migrate-org-auth.ts
 *
 * One-time Phase-1 migration:
 *   1. Creates the organisation_user_role ENUM and organisation_users table
 *      (idempotent — skipped if they already exist).
 *   2. Copies every organisation's existing email + password into
 *      organisation_users as role = 'admin'.
 *   3. Drops the email and password columns from the organisations table.
 *
 * Run once with:
 *   npx ts-node --esm src/scripts/migrate-org-auth.ts
 */

import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

async function run() {
  const q = (sql: string, replacements?: any[]) =>
    sequelize.query(sql, { type: QueryTypes.RAW, replacements });

  console.log('🔄 Connecting to database…');
  await sequelize.authenticate();
  console.log('✅ Connected.\n');

  // ── Step 1: Create ENUM type (idempotent) ──────────────────────────────────
  console.log('1. Creating organisation_user_role ENUM…');
  await q(`
    DO $$ BEGIN
      CREATE TYPE public.organisation_user_role AS ENUM ('admin', 'sub_admin');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
  console.log('   ✅ ENUM ready.\n');

  // ── Step 2: Create organisation_users table (idempotent) ──────────────────
  console.log('2. Creating organisation_users table…');
  await q(`
    CREATE TABLE IF NOT EXISTS public.organisation_users (
      id              SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
      email           VARCHAR(100) NOT NULL UNIQUE,
      password        VARCHAR(200) NOT NULL,
      role            public.organisation_user_role NOT NULL DEFAULT 'admin',
      is_active       BOOLEAN NOT NULL DEFAULT TRUE
    );
  `);
  console.log('   ✅ Table ready.\n');

  // ── Step 3: Copy existing credentials ─────────────────────────────────────
  // NOTE: If sequelize.sync({ alter: true }) already ran with the updated
  // Organisations model (email/password removed), those columns are already
  // gone from the DB and this step will be skipped automatically.
  console.log('3. Copying existing org credentials → organisation_users (if columns still exist)…');

  // Check if source columns still exist
  const [{ col_exists }] = await sequelize.query(
    `SELECT COUNT(*) > 0 AS col_exists
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'organisations'
       AND column_name = 'email'`,
    { type: QueryTypes.SELECT }
  ) as any[];

  if (col_exists) {
    const result = await sequelize.query(`
      INSERT INTO public.organisation_users (organisation_id, email, password, role, is_active)
      SELECT
        o.id,
        o.email,
        COALESCE(o.password, 'CHANGE_ME'),
        'admin',
        TRUE
      FROM public.organisations o
      WHERE o.email IS NOT NULL
        AND o.email <> ''
        AND NOT EXISTS (
          SELECT 1 FROM public.organisation_users ou
          WHERE ou.organisation_id = o.id
        )
      RETURNING id, organisation_id, email;
    `, { type: QueryTypes.SELECT });

    console.log(`   ✅ Migrated ${(result as any[]).length} organisation user(s).\n`);

    // Drop source columns
    console.log('4. Dropping email and password columns from organisations…');
    await q(`
      ALTER TABLE public.organisations
        DROP COLUMN IF EXISTS email,
        DROP COLUMN IF EXISTS password;
    `);
    console.log('   ✅ Columns dropped.\n');
  } else {
    console.log('   ⚠️  Source columns (email/password) already removed from organisations — skipping copy.');
    console.log('   ℹ️  If any existing orgs need a login, create their organisation_users row manually.\n');
  }

  console.log('🎉 Phase-1 migration complete. Reboot the backend server.');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
