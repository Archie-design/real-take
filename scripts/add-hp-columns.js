const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addHPColumns() {
    console.log('Adding HP and MaxHP columns to CharacterStats...');

    // In Supabase, we can execute SQL via the rpc if an exec_sql function exists,
    // or we can just try to update a record with the new column (which will fail if not exists, but we can't create columns via standard JS client API).
    // Actually, earlier script used a different approach or the user has an endpoint for it.
    // Let's create an SQL migration file first, and see if I can execute it.
    console.log('Please execute the following SQL in your Supabase SQL Editor:');
    console.log(`
      ALTER TABLE "CharacterStats" 
      ADD COLUMN IF NOT EXISTS "HP" INTEGER,
      ADD COLUMN IF NOT EXISTS "MaxHP" INTEGER;
    `);
}

addHPColumns().catch(console.error);
