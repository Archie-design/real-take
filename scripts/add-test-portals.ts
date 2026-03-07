import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const portals = [
        { type: 'portal', q: 1, r: -1, icon: '⛩️', name: '歸心陣', is_active: true }
    ];

    for (const p of portals) {
        // Delete existing portal at that location first
        await supabase.from('MapEntities').delete().match({ q: p.q, r: p.r, type: 'portal' });

        const { data, error } = await supabase.from('MapEntities').insert([p]).select();
        if (error) {
            console.error(`Error inserting portal at (${p.q}, ${p.r}):`, error);
        } else {
            console.log(`Inserted test portal at (${p.q}, ${p.r})`);
        }
    }
}

main().catch(console.error);
