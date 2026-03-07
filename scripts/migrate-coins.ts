import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    console.log('Migrating Coins and RPG stats...');

    // We can't easily alter columns with supabase REST API directly in this way without the Postgres extension
    // So we will use the connection string approach just like the previous migration did
    const { Client } = require('pg');
    const dbUrl = process.env.DATABASE_URL;
    const client = new Client({
        connectionString: dbUrl,
    });

    await client.connect();

    try {
        await client.query('BEGIN');

        console.log('Adding Coins and Inventory to CharacterStats...');
        await client.query(`
            ALTER TABLE "CharacterStats" 
            ADD COLUMN IF NOT EXISTS "Coins" integer DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "Inventory" jsonb DEFAULT '[]'::jsonb;
        `);

        console.log('Adding team_coins to TeamSettings...');
        await client.query(`
            ALTER TABLE "TeamSettings" 
            ADD COLUMN IF NOT EXISTS "team_coins" integer DEFAULT 0;
        `);

        // Recalculate levels for all existing players based on new curved RPG system
        // Optional but highly recommended if we want them to reflect the N*5+480 curve right now
        // Let's do this in a Node loop to use the same logic
        const res = await client.query('SELECT "UserID", "Exp" FROM "CharacterStats"');
        const users = res.rows;

        console.log(`Recalculating RPG Levels for ${users.length} users with new logic...`);
        let count = 0;
        for (const user of users) {
            const exp = parseInt(user.Exp, 10) || 0;
            let currentLevel = 1;
            let accumulatedExp = 0;

            while (currentLevel < 99) {
                const nextLevelRequired = currentLevel * 5 + 480;
                if (exp >= accumulatedExp + nextLevelRequired) {
                    accumulatedExp += nextLevelRequired;
                    currentLevel++;
                } else {
                    break;
                }
            }

            await client.query('UPDATE "CharacterStats" SET "Level" = $1 WHERE "UserID" = $2', [currentLevel, user.UserID]);
            count++;
        }

        console.log(`Successfully recalculated ${count} users' levels.`);

        await client.query('COMMIT');
        console.log('Migration Completed Successfully!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        await client.end();
    }
}

main();
