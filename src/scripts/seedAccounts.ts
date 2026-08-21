import sequelize from '../config/database';
import { Users, Organisations } from '../models';

async function seedAccounts() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connected.');

    // 1. Seed/Update System Admin User
    console.log('Seeding System Admin account...');
    let adminUser = await Users.findOne({ where: { role: 'super_admin' } });
    if (!adminUser) {
      adminUser = await Users.findOne({ where: { username: 'admin' } });
    }

    if (adminUser) {
      await adminUser.update({
        username: 'admin',
        email: 'admin@digigate.com',
        password: '123456',
        full_name: 'System Administrator',
        role: 'super_admin',
        is_verified: true
      });
    } else {
      adminUser = await Users.create({
        username: 'admin',
        email: 'admin@digigate.com',
        password: '123456',
        full_name: 'System Administrator',
        role: 'super_admin',
        is_verified: true
      });
    }
    console.log('Admin account created/updated: admin@digigate.com / admin');

    // Helper to seed/update an organisation and its admin user
    const seedOrgWithUser = async (orgData: {
      name: string;
      code: string;
      email: string;
      phone: string;
      city: string;
      username: string;
      fullName: string;
    }) => {
      let org = await Organisations.findOne({ where: { code: orgData.code } });
      if (!org) {
        org = await Organisations.findOne({ where: { email: orgData.email } });
      }

      if (org) {
        await org.update({
          name: orgData.name,
          code: orgData.code,
          email: orgData.email,
          phone: orgData.phone,
          city: orgData.city,
          is_active: true
        });
      } else {
        org = await Organisations.create({
          name: orgData.name,
          code: orgData.code,
          email: orgData.email,
          phone: orgData.phone,
          city: orgData.city,
          is_active: true,
          host_available_message: `Thank you for visiting ${orgData.name}! :visitor_name, :host_name will be with you shortly.`,
          host_unavailable_message: `Thank you for visiting ${orgData.name}! :visitor_name, :host_name is currently unavailable.`
        });
      }

      // Check or create user for this organisation
      let orgUser = await Users.findOne({ where: { organisation_id: org.id } });
      if (!orgUser) {
        orgUser = await Users.findOne({ where: { username: orgData.username } });
      }

      if (orgUser) {
        await orgUser.update({
          username: orgData.username,
          email: orgData.email,
          password: '123456',
          full_name: orgData.fullName,
          role: 'organisation',
          organisation_id: org.id,
          is_verified: true
        });
      } else {
        orgUser = await Users.create({
          username: orgData.username,
          email: orgData.email,
          password: '123456',
          full_name: orgData.fullName,
          role: 'organisation',
          organisation_id: org.id,
          is_verified: true
        });
      }

      return { org, orgUser };
    };

    // 2. Organisation 1: Zordial Technologies
    console.log('Seeding Zordial Technologies...');
    await seedOrgWithUser({
      name: 'Zordial Technologies',
      code: 'ZORDIAL',
      email: 'zordial@digigate.com',
      phone: '+1-555-0100',
      city: 'Innovation Hub',
      username: 'zordial',
      fullName: 'Zordial Administrator'
    });

    // 3. Organisation 2: Apex Global Enterprises
    console.log('Seeding Apex Global Enterprises...');
    await seedOrgWithUser({
      name: 'Apex Global Enterprises',
      code: 'APEX',
      email: 'apex@digigate.com',
      phone: '+1-555-0199',
      city: 'Metropolis',
      username: 'apex',
      fullName: 'Apex Administrator'
    });

    // 4. Organisation 3: Nexus Innovation Labs
    console.log('Seeding Nexus Innovation Labs...');
    await seedOrgWithUser({
      name: 'Nexus Innovation Labs',
      code: 'NEXUS',
      email: 'nexus@digigate.com',
      phone: '+1-555-0288',
      city: 'Tech City',
      username: 'nexus',
      fullName: 'Nexus Administrator'
    });

    console.log('\n==========================================');
    console.log('ALL PROFESSIONAL ACCOUNTS SEEDED SUCCESSFULLY!');
    console.log('==========================================\n');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding accounts:', error);
    process.exit(1);
  }
}

seedAccounts();
