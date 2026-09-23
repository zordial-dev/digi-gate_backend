import sequelize from '../config/database';
import { Organisations, People, Visitors, VisitorVisits } from '../models';

async function inspectHostedDb() {
  try {
    console.log('Connecting to hosted database...');
    await sequelize.authenticate();
    console.log('✅ Connected to Hosted PostgreSQL Database.\n');

    // 1. ORGANISATIONS
    const orgs = await Organisations.findAll({ raw: true });
    console.log('==========================================');
    console.log(`🏢 ORGANISATIONS (${orgs.length} total):`);
    console.log('==========================================');
    orgs.forEach((o: any) => {
      console.log(`ID: ${o.id} | Code: ${o.code} | Name: "${o.name}" | Active: ${o.is_active} | Email: ${o.email || 'N/A'} | Password: ${o.password || 'N/A'}`);
    });

    // 2. HOSTS / PEOPLE
    const hosts = await People.findAll({ raw: true });
    console.log('\n==========================================');
    console.log(`👥 HOSTS / STAFF (${hosts.length} total):`);
    console.log('==========================================');
    hosts.forEach((h: any) => {
      console.log(`ID: ${h.id} | Name: "${h.full_name}" | Email: "${h.email}" | Phone: "${h.mobile_number}" | Available: ${h.is_available} | Org ID: ${h.organisation_id}`);
    });

    // 3. VISITORS
    const visitors = await Visitors.findAll({ raw: true });
    console.log('\n==========================================');
    console.log(`📇 VISITORS DIRECTORY (${visitors.length} total):`);
    console.log('==========================================');
    visitors.forEach((v: any) => {
      console.log(`ID: ${v.id} | Name: "${v.full_name}" | Phone: "${v.mobile_number}" | Email: "${v.email || 'N/A'}"`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Inspect error:', err);
    process.exit(1);
  }
}

inspectHostedDb();
