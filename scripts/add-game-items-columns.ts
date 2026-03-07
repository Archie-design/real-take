import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    console.log('Adding GameGold and GameInventory to CharacterStats...');

    const { Client } = require('pg');
    const dbUrl = process.env.DATABASE_URL;
    const client = new Client({ connectionString: dbUrl });

    await client.connect();

    try {
        await client.query(`
            ALTER TABLE "CharacterStats" 
            ADD COLUMN IF NOT EXISTS "GameGold" INTEGER DEFAULT 0
        `);

        await client.query(`
            ALTER TABLE "CharacterStats" 
            ADD COLUMN IF NOT EXISTS "GameInventory" JSONB DEFAULT '[]'::jsonb
        `);

        console.log('Successfully added in-game items system columns.');
    } catch (e) {
        console.error('Failed to update schema:\n', e);
    } finally {
        await client.end();
    }
}

main();
