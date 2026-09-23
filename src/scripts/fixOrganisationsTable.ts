import sequelize from '../config/database.js';

async function fixOrganisationsTable() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();

    console.log('Adding password column to public.organisations...');
    await sequelize.query(`
      ALTER TABLE public.organisations 
      ADD COLUMN IF NOT EXISTS password VARCHAR(200);
    `);
    console.log('✅ Added password column to public.organisations.');

    console.log('Checking columns of public.organisations...');
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'organisations';
    `);
    console.log('Columns in organisations table:', columns.map((c: any) => c.column_name));

    process.exit(0);
  } catch (err) {
    console.error('Error fixing organisations table:', err);
    process.exit(1);
  }
}

fixOrganisationsTable();
