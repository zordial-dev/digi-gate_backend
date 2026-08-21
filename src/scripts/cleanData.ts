import sequelize from '../config/database';
import { Users, Organisations, Visitors, VisitorVisits } from '../models';
import { Op } from 'sequelize';

async function cleanData() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // 1. Update ALL users' password to "123456"
    console.log('Updating all user passwords to 123456...');
    const [updatedUsersCount] = await Users.update(
      { password: '123456' },
      { where: {} }
    );
    console.log(`Updated ${updatedUsersCount} user passwords to '123456'.`);

    // 2. Truncate/Delete all visitor_visits
    console.log('Truncating visitor_visits table...');
    await VisitorVisits.destroy({ where: {}, truncate: false });
    console.log('visitor_visits cleaned.');

    // 3. Truncate/Delete all visitors
    console.log('Truncating visitors table...');
    await Visitors.destroy({ where: {}, truncate: false });
    console.log('visitors cleaned.');

    // 4. Find Zordial Organisation
    let zordialOrg = await Organisations.findOne({
      where: {
        name: {
          [Op.iLike]: '%zordial%'
        }
      }
    });

    if (!zordialOrg) {
      console.log('Zordial organisation not found. Creating Zordial organisation...');
      zordialOrg = await Organisations.create({
        name: 'Zordial Technologies',
        code: 'ZORDIAL',
        is_active: true
      });
    }

    console.log(`Zordial Organisation ID: ${zordialOrg.id} (${zordialOrg.name})`);

    // Re-assign all non-admin users to Zordial organisation before removing other orgs
    await Users.update(
      { organisation_id: zordialOrg.id },
      { where: { role: { [Op.ne]: 'super_admin' } } }
    );

    // 5. Remove all organisations EXCEPT Zordial
    const deletedOrgsCount = await Organisations.destroy({
      where: {
        id: {
          [Op.ne]: zordialOrg.id
        }
      }
    });
    console.log(`Deleted ${deletedOrgsCount} non-Zordial organisations.`);

    console.log('Database cleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning database:', error);
    process.exit(1);
  }
}

cleanData();
