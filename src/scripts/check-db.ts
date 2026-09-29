import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

async function run() {
  await sequelize.authenticate();

  const cols = await sequelize.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='organisations' AND table_schema='public' ORDER BY column_name",
    { type: QueryTypes.SELECT }
  );
  console.log('organisations columns:', (cols as any[]).map((c: any) => c.column_name).join(', '));

  const ou = await sequelize.query(
    'SELECT id, organisation_id, email, role, is_active FROM public.organisation_users LIMIT 20',
    { type: QueryTypes.SELECT }
  );
  console.log('organisation_users count:', (ou as any[]).length);
  console.log(JSON.stringify(ou, null, 2));

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
