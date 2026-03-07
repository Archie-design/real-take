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
    const targetPhone = "0987654321"; // Replace with your standard test account if different

    // Give the user item id `i7` which is 神行甲馬
    const { data: user, error } = await supabase.from('CharacterStats').select('*').eq('UserID', targetPhone).single();

    if (error || !user) {
        console.error("Could not find user. Make sure the phone number in the script is correct.");
        return;
    }

    const currentInv = user.GameInventory || [];
    const exist = currentInv.find((i: any) => i.id === 'i7');
    const newInv = exist
        ? currentInv.map((i: any) => i.id === 'i7' ? { ...i, count: i.count + 5 } : i)
        : [...currentInv, { id: 'i7', count: 5 }];

    const { error: updateErr } = await supabase.from('CharacterStats').update({ GameInventory: newInv }).eq('UserID', targetPhone);

    if (updateErr) {
        console.error("Failed to give item:", updateErr);
    } else {
        console.log(`Successfully gave 5 神行甲馬 (Dash Multiplier) items to ${targetPhone}.`);
    }
}

main().catch(console.error);
