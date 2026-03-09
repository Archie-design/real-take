import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
        await client.query('BEGIN');

        console.log('Creating W4Applications table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS public."W4Applications" (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                squad_name TEXT,
                battalion_name TEXT,
                interview_target TEXT NOT NULL,
                interview_date TEXT NOT NULL,
                description TEXT,
                quest_id TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                squad_review_by TEXT,
                squad_review_at TIMESTAMPTZ,
                squad_review_notes TEXT,
                final_review_by TEXT,
                final_review_at TIMESTAMPTZ,
                final_review_notes TEXT,
                created_at TIMESTAMPTZ DEFAULT now()
            );
        `);

        await client.query(`ALTER TABLE public."W4Applications" ENABLE ROW LEVEL SECURITY;`);
        await client.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on W4Applications') THEN
                    CREATE POLICY "Allow public read on W4Applications" ON public."W4Applications" FOR SELECT USING (true);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public insert on W4Applications') THEN
                    CREATE POLICY "Allow public insert on W4Applications" ON public."W4Applications" FOR INSERT WITH CHECK (true);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public update on W4Applications') THEN
                    CREATE POLICY "Allow public update on W4Applications" ON public."W4Applications" FOR UPDATE USING (true);
                END IF;
            END $$;
        `);

        console.log('Creating AdminActivityLog table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS public."AdminActivityLog" (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                action TEXT NOT NULL,
                actor TEXT,
                target_id TEXT,
                target_name TEXT,
                details JSONB,
                result TEXT DEFAULT 'success',
                created_at TIMESTAMPTZ DEFAULT now()
            );
        `);

        await client.query(`ALTER TABLE public."AdminActivityLog" ENABLE ROW LEVEL SECURITY;`);
        await client.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on AdminActivityLog') THEN
                    CREATE POLICY "Allow public read on AdminActivityLog" ON public."AdminActivityLog" FOR SELECT USING (true);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public insert on AdminActivityLog') THEN
                    CREATE POLICY "Allow public insert on AdminActivityLog" ON public."AdminActivityLog" FOR INSERT WITH CHECK (true);
                END IF;
            END $$;
        `);

        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
