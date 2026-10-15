import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/database.js';
import '../models/index.js';

async function createTables() {
  console.log('🔄 Connecting to PostgreSQL database...');
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database successfully.');

    console.log('🛠️ Running table creation and schema migration script...');

    // 1. Ensure required columns on organisations
    console.log('  -> Verifying organisations columns...');
    await sequelize.query(`
      ALTER TABLE organisations 
      ADD COLUMN IF NOT EXISTS working_days JSON DEFAULT '["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]',
      ADD COLUMN IF NOT EXISTS opening_time VARCHAR(10) DEFAULT '09:00',
      ADD COLUMN IF NOT EXISTS closing_time VARCHAR(10) DEFAULT '18:00',
      ADD COLUMN IF NOT EXISTS holidays JSON DEFAULT '[]';
    `);

    // 2. Ensure required columns on people (hosts)
    console.log('  -> Verifying people (hosts) columns...');
    await sequelize.query(`
      ALTER TABLE people 
      ADD COLUMN IF NOT EXISTS unavailable_dates JSON DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS available_from TIME DEFAULT '09:00:00',
      ADD COLUMN IF NOT EXISTS available_to TIME DEFAULT '18:00:00',
      ADD COLUMN IF NOT EXISTS lunch_from TIME DEFAULT '13:00:00',
      ADD COLUMN IF NOT EXISTS lunch_to TIME DEFAULT '14:00:00',
      ADD COLUMN IF NOT EXISTS working_days JSON DEFAULT '["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]',
      ADD COLUMN IF NOT EXISTS date_overrides JSON DEFAULT '{}';
    `);

    // 3. Create invitations table
    console.log('  -> Creating invitations table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS invitations (
        id SERIAL PRIMARY KEY,
        invitation_code VARCHAR(30) UNIQUE NOT NULL,
        organisation_id INTEGER REFERENCES organisations(id) ON DELETE CASCADE,
        host_id INTEGER REFERENCES people(id) ON DELETE CASCADE,
        visitor_name VARCHAR(150) NOT NULL,
        mobile_number VARCHAR(20) NOT NULL,
        purpose_of_visit VARCHAR(255) NOT NULL,
        valid_date DATE NOT NULL DEFAULT CURRENT_DATE,
        valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
        additional_notes TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        used_at TIMESTAMP WITH TIME ZONE,
        visit_id INTEGER REFERENCES visitor_visits(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_invitations_mobile ON invitations(mobile_number);
      CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(invitation_code);
      CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(organisation_id);
      CREATE INDEX IF NOT EXISTS idx_invitations_host ON invitations(host_id);
      CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
    `);

    // 4. Run Sequelize model synchronization
    console.log('  -> Synchronizing Sequelize models with database...');
    await sequelize.sync();

    // 5. Verify table structure
    const [invitationCols] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'invitations'
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 Invitations Table Schema:');
    console.table(invitationCols);

    console.log('\n🎉 Table creation script completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error during table creation:', err);
    process.exit(1);
  }
}

createTables();
