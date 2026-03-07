import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    console.log('Adding Facing to CharacterStats...');

    const { Client } = require('pg');
    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
        console.error("Missing DATABASE_URL in .env.local");
        process.exit(1);
    }

    const client = new Client({ connectionString: dbUrl });

    await client.connect();

    try {
        await client.query(`
            ALTER TABLE "CharacterStats" 
            ADD COLUMN IF NOT EXISTS "Facing" INTEGER DEFAULT 0
        `);

        console.log('Successfully added Facing column.');
    } catch (e) {
        console.error('Failed to update schema:\n', e);
    } finally {
        await client.end();
    }
}

main();
