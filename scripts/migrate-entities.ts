import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const sql = `
CREATE TABLE IF NOT EXISTS public."MapEntities" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    q INTEGER NOT NULL,
    r INTEGER NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    data JSONB,
    owner_id TEXT REFERENCES public."CharacterStats"("UserID") ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public."MapEntities" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on active map entities') THEN
        CREATE POLICY "Allow public read on active map entities" ON public."MapEntities" FOR SELECT USING (is_active = true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated inserts') THEN
        CREATE POLICY "Allow authenticated inserts" ON public."MapEntities" FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated updates') THEN
        CREATE POLICY "Allow authenticated updates" ON public."MapEntities" FOR UPDATE USING (true);
    END IF;
END $$;
`;

async function run() {
    try {
        console.log("Creating MapEntities...");
        await pool.query(sql);
        console.log("Success!");
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
