import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error("Missing DATABASE_URL in .env.local");
    process.exit(1);
}

const client = new Client({
    connectionString: dbUrl,
});

async function main() {
    try {
        await client.connect();
        console.log("Connected to the database. Creating TemporaryQuests table...");

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS "TemporaryQuests" (
                "id" TEXT PRIMARY KEY,
                "title" TEXT NOT NULL,
                "sub" TEXT,
                "reward" INTEGER NOT NULL DEFAULT 0,
                "dice" INTEGER,
                "icon" TEXT,
                "limit" INTEGER,
                "active" BOOLEAN NOT NULL DEFAULT true,
                "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );
        `;

        await client.query(createTableQuery);

        console.log("Table TemporaryQuests created successfully.");

        // Insert some initial test data
        const checkQuery = `SELECT COUNT(*) FROM "TemporaryQuests"`;
        const res = await client.query(checkQuery);
        
        if (parseInt(res.rows[0].count) === 0) {
            console.log("Inserting initial test data into TemporaryQuests...");
            const insertDataQuery = `
                INSERT INTO "TemporaryQuests" (id, title, sub, reward, dice, icon, "limit", active)
                VALUES 
                ('tq_test_1', '測試臨時任務1', '擊敗心魔即可獲得', 1500, 1, '🎯', 1, true),
                ('tq_test_2', '測試臨時任務2', '探索未知區域', 2000, 2, '🗺️', 1, true);
            `;
            await client.query(insertDataQuery);
            console.log("Initial test data inserted successfully.");
        } else {
            console.log("Table already contains data. Skipping initial insert.");
        }

    } catch (err) {
        console.error("Error executing database query:", err);
    } finally {
        await client.end();
    }
}

main();
