import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseActionKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseActionKey);

async function check() {
    const { data: stats, error } = await supabase.from("CharacterStats").select("SquadName, TeamName, IsCaptain, IsCommandant, Name").eq("SquadName", "方圓");
    if (error) {
        console.error("DB Error:", error);
        return;
    }
    
    console.log(`Total Fangyuan members: \${stats.length}`);
    
    // Extract unique team names
    const teams = new Set(stats.map(s => s.TeamName));
    console.log("Teams:");
    console.log(Array.from(teams).sort());
}
check();
