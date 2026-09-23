import sequelize from '../config/database';
import { Organisations } from '../models';

async function seedAccounts() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connected.');

    // Helper to seed/update an organisation with password & active status
    const seedOrg = async (orgData: {
      name: string;
      code: string;
      email: string;
      phone: string;
      city: string;
      password?: string;
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
          password: orgData.password || '123456',
          is_active: true,
          is_approved: 1
        });
      } else {
        org = await Organisations.create({
          name: orgData.name,
          code: orgData.code,
          email: orgData.email,
          phone: orgData.phone,
          city: orgData.city,
          password: orgData.password || '123456',
          is_active: true,
          is_approved: 1,
          host_available_message: `Thank you for visiting ${orgData.name}! :visitor_name, :host_name will be with you shortly.`,
          host_unavailable_message: `Thank you for visiting ${orgData.name}! :visitor_name, :host_name is currently unavailable.`
        });
      }

      return org;
    };

    // 1. Organisation 1: Zordial Technologies
    console.log('Seeding Zordial Technologies...');
    await seedOrg({
      name: 'Zordial Technologies',
      code: 'ZORDIAL',
      email: 'info@zordial.com',
      phone: '+91 98765 43210',
      city: 'Ahmedabad',
      password: '123456'
    });

    // 2. Organisation 2: Acme Corp
    console.log('Seeding Acme Corp...');
    await seedOrg({
      name: 'Acme Corporation',
      code: 'ACME',
      email: 'contact@acme.com',
      phone: '+91 91234 56789',
      city: 'Mumbai',
      password: '123456'
    });

    console.log('--- Seeding Completed Successfully ---');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding accounts:', error);
    process.exit(1);
  }
}

seedAccounts();
