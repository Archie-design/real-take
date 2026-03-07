import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    console.log('Adding test funds to all players and teams...');

    const { Client } = require('pg');
    const dbUrl = process.env.DATABASE_URL;
    const client = new Client({ connectionString: dbUrl });

    await client.connect();

    try {
        await client.query('BEGIN');

        // Give everyone 2000 coins and set energy dice to 10
        await client.query(`
            UPDATE "CharacterStats" 
            SET "Coins" = 2000, "EnergyDice" = 10
        `);

        // Give teams 5000 coins
        await client.query(`
            UPDATE "TeamSettings" 
            SET "team_coins" = 5000
        `);

        await client.query('COMMIT');
        console.log('Successfully injected test funds.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Failed to inject funds:', e);
    } finally {
        await client.end();
    }
}

main();
