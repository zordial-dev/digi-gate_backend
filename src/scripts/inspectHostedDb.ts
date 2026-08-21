import sequelize from '../config/database';
import { Users, Organisations, People, Visitors, VisitorVisits } from '../models';

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
      console.log(`ID: ${o.id} | Code: ${o.code} | Name: "${o.name}" | Active: ${o.is_active} | Email: ${o.email || 'N/A'}`);
    });

    // 2. USERS
    const users = await Users.findAll({ raw: true });
    console.log('\n==========================================');
    console.log(`👤 USERS / ACCOUNTS (${users.length} total):`);
    console.log('==========================================');
    users.forEach((u: any) => {
      console.log(`ID: ${u.id} | Username: "${u.username}" | Email: "${u.email}" | Password: "${u.password}" | Role: "${u.role}" | Org ID: ${u.organisation_id}`);
    });

    // 3. HOSTS / PEOPLE
    const hosts = await People.findAll({ raw: true });
    console.log('\n==========================================');
    console.log(`👥 HOSTS / STAFF (${hosts.length} total):`);
    console.log('==========================================');
    hosts.forEach((h: any) => {
      console.log(`ID: ${h.id} | Name: "${h.full_name}" | Email: "${h.email}" | Phone: "${h.mobile_number}" | Available: ${h.is_available} | Org ID: ${h.organisation_id}`);
    });

    // 4. VISITORS
    const visitors = await Visitors.findAll({ raw: true });
    console.log('\n==========================================');
    console.log(`📇 VISITORS DIRECTORY (${visitors.length} total):`);
    console.log('==========================================');
    visitors.forEach((v: any) => {
      console.log(`ID: ${v.id} | Name: "${v.full_name}" | Phone: "${v.phone}" | Email: "${v.email}" | Org ID: ${v.organisation_id}`);
    });

    // 5. VISITOR VISITS
    const visits = await VisitorVisits.findAll({ raw: true });
    console.log('\n==========================================');
    console.log(`📌 VISITOR VISITS LOG (${visits.length} total):`);
    console.log('==========================================');
    visits.forEach((vt: any) => {
      console.log(`ID: ${vt.id} | Visitor ID: ${vt.visitor_id} | Host ID: ${vt.host_id} | Status: "${vt.status}" | Check-In: ${vt.check_in_time} | Org ID: ${vt.organisation_id}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error inspecting database:', error);
    process.exit(1);
  }
}

inspectHostedDb();
