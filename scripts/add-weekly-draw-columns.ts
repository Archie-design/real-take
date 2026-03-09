import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
        await client.query('BEGIN');

        console.log('Adding weekly draw columns to TeamSettings...');
        await client.query(`
            ALTER TABLE "TeamSettings"
            ADD COLUMN IF NOT EXISTS "mandatory_quest_id"   TEXT,
            ADD COLUMN IF NOT EXISTS "mandatory_quest_week" TEXT,
            ADD COLUMN IF NOT EXISTS "quest_draw_history"   JSONB DEFAULT '[]'::jsonb;
        `);

        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
