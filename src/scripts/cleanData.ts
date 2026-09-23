import sequelize from '../config/database';
import { Organisations, Visitors, VisitorVisits } from '../models';
import { Op } from 'sequelize';

async function cleanData() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // 1. Update ALL organisations' password to "123456"
    console.log('Updating all organisation passwords to 123456...');
    const [updatedOrgsCount] = await Organisations.update(
      { password: '123456' },
      { where: {} }
    );
    console.log(`Updated ${updatedOrgsCount} organisation passwords to '123456'.`);

    // 2. Truncate/Delete all visitor_visits
    console.log('Truncating visitor_visits table...');
    await VisitorVisits.destroy({ where: {}, truncate: false });
    console.log('visitor_visits cleaned.');

    // 3. Truncate/Delete all visitors
    console.log('Truncating visitors table...');
    await Visitors.destroy({ where: {}, truncate: false });
    console.log('visitors cleaned.');

    console.log('--- Cleanup Completed Successfully ---');
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning data:', error);
    process.exit(1);
  }
}

cleanData();
