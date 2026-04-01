import { config } from 'dotenv';
import path from 'path';

// 載入環境變數
config({ path: path.resolve(process.cwd(), '.env.local') });

import { connectDb } from '../lib/db';
import { calculateLevelFromExp } from '../lib/constants';

async function main() {
    const client = await connectDb();
    try {
        const { rows } = await client.query('SELECT "UserID", "Exp", "Level" FROM "CharacterStats"');
        console.log(`Checking ${rows.length} users...`);

        for (const row of rows) {
            const newLevel = calculateLevelFromExp(row.Exp);
            if (newLevel !== row.Level) {
                console.log(`User ${row.UserID}: Exp ${row.Exp}, Old Level ${row.Level} -> New Level ${newLevel}`);
                await client.query('UPDATE "CharacterStats" SET "Level" = $1 WHERE "UserID" = $2', [newLevel, row.UserID]);
            }
        }
        console.log('Sync complete.');
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

main();
