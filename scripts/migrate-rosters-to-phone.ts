/**
 * 將 Rosters 表主鍵從 email 改為 phone
 *
 * 用法：npx ts-node -O '{"module":"commonjs"}' scripts/migrate-rosters-to-phone.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const sql = `
-- 1. 新增 phone 欄位（若已存在則跳過）
ALTER TABLE public."Rosters" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- 2. 移除舊的 email 主鍵約束
ALTER TABLE public."Rosters" DROP CONSTRAINT IF EXISTS "Rosters_pkey";

-- 3. email 改為普通可為空欄位（已是 TEXT，保留做備用識別）
-- 無需額外操作，email 欄位自動降為普通欄位

-- 4. 以 phone 設定新主鍵（需先確保沒有 NULL）
-- 注意：執行前請確認 phone 欄位已填入資料
-- 若有資料庫現有資料，此步驟需確認 phone 不為 NULL，否則會失敗
-- ALTER TABLE public."Rosters" ADD PRIMARY KEY ("phone");

-- 暫以 UNIQUE 約束取代，允許 phone 為 NULL（方便先行匯入名冊再補電話）
ALTER TABLE public."Rosters" DROP CONSTRAINT IF EXISTS "Rosters_phone_key";
ALTER TABLE public."Rosters" ADD CONSTRAINT "Rosters_phone_key" UNIQUE ("phone");
`;

async function run() {
    const client = await pool.connect();
    try {
        console.log('開始遷移 Rosters 表主鍵...');
        await client.query(sql);
        console.log('✓ 成功：phone 欄位已加入，email 降為一般欄位，phone 設為 UNIQUE');
        console.log('');
        console.log('下一步：');
        console.log('  1. 在 fangyuan_roster_import.csv 填入各成員手機號碼');
        console.log('  2. 透過管理介面匯入名冊');
    } catch (e: any) {
        console.error('遷移失敗：', e.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
