import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    // There isn't an explicit "ALTER TABLE" via standard Supabase JS client outside of raw RPC
    // So we will just use an RPC function if it exists or do nothing.
    // Using postgres raw connection via node-postgres is better but we don't have connection strings.
    // We will just do a test insert instead to check if the column exists, or otherwise rely on the user to run SQL.
    console.log("Please run the following SQL command in your Supabase SQL Editor:");
    console.log(`
      ALTER TABLE "CharacterStats" ADD COLUMN IF NOT EXISTS "GoldenDice" integer DEFAULT 0;
    `);
}

main().catch(console.error);
