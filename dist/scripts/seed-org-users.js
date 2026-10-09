import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';
async function run() {
    await sequelize.authenticate();
    console.log('✅ Connected.\n');
    // Clear existing rows
    await sequelize.query('DELETE FROM public.organisation_users', { type: QueryTypes.RAW });
    console.log('🗑️  Cleared existing organisation_users rows.\n');
    // Fetch all orgs
    const orgs = await sequelize.query('SELECT id, name FROM public.organisations ORDER BY id', { type: QueryTypes.SELECT });
    const seen = new Map(); // track duplicate first-words
    for (const org of orgs) {
        // First word of name, lowercase, letters/digits only
        const firstWord = String(org.name).trim().split(/\s+/)[0]
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '') || 'org';
        // Handle duplicates: zordial, zordial2, zordial3, ...
        const count = seen.get(firstWord) || 0;
        seen.set(firstWord, count + 1);
        const email = count === 0 ? `${firstWord}@digigate.com` : `${firstWord}${count + 1}@digigate.com`;
        await sequelize.query(`INSERT INTO public.organisation_users (organisation_id, email, password, role, is_active)
       VALUES ($1, $2, '123456', 'admin', TRUE)`, { type: QueryTypes.RAW, bind: [org.id, email] });
        console.log(`  [${org.id}] ${org.name}  →  ${email}  /  123456`);
    }
    console.log('\n✅ Done! Use the email + password 123456 to log in.');
    process.exit(0);
}
run().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
