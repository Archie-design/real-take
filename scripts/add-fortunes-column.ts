import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function main() {
    console.log('Adding InitialFortunes column to CharacterStats...');

    const { Client } = require('pg');
    const dbUrl = process.env.DATABASE_URL;
    const client = new Client({ connectionString: dbUrl });

    await client.connect();

    try {
        await client.query(`
            ALTER TABLE "CharacterStats" 
            ADD COLUMN IF NOT EXISTS "InitialFortunes" JSONB
        `);

        // Also add the DDA difficulty tracking column described in plan
        await client.query(`
            ALTER TABLE "CharacterStats" 
            ADD COLUMN IF NOT EXISTS "DDA_Difficulty" VARCHAR(50) DEFAULT 'Normal'
        `);

        console.log('Successfully added DDA and InitialFortunes columns.');
    } catch (e) {
        console.error('Failed to update schema:\n', e);
    } finally {
        await client.end();
    }
}

main();
