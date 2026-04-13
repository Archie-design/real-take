/**
 * 刪除 CharacterStats 中確認未使用的欄位，並移除孤立的骰子 RPC 函式
 *
 * 分三群：
 *   A. RPG 屬性：Spirit, Physique, Charisma, Savvy, Luck, Potential
 *   B. 舊遊戲系統：EnergyDice, GoldenDice, Coins, GameGold, GameInventory, Inventory, Role, DDA_Difficulty
 *   C. 廢棄地圖系統：Facing, HP, MaxHP, CurrentQ, CurrentR
 *
 * 用法：npx ts-node -O '{"module":"commonjs"}' scripts/drop-unused-columns.ts
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
-- ══════════════════════════════════════════════════════════════
-- A. RPG 屬性欄位（從未在任何頁面或 action 中使用）
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public."CharacterStats"
    DROP COLUMN IF EXISTS "Spirit",
    DROP COLUMN IF EXISTS "Physique",
    DROP COLUMN IF EXISTS "Charisma",
    DROP COLUMN IF EXISTS "Savvy",
    DROP COLUMN IF EXISTS "Luck",
    DROP COLUMN IF EXISTS "Potential";

-- ══════════════════════════════════════════════════════════════
-- B. 舊遊戲系統欄位
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public."CharacterStats"
    DROP COLUMN IF EXISTS "EnergyDice",
    DROP COLUMN IF EXISTS "GoldenDice",
    DROP COLUMN IF EXISTS "Coins",
    DROP COLUMN IF EXISTS "GameGold",
    DROP COLUMN IF EXISTS "GameInventory",
    DROP COLUMN IF EXISTS "Inventory",
    DROP COLUMN IF EXISTS "Role",
    DROP COLUMN IF EXISTS "DDA_Difficulty";

-- ══════════════════════════════════════════════════════════════
-- C. 廢棄地圖系統欄位
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public."CharacterStats"
    DROP COLUMN IF EXISTS "Facing",
    DROP COLUMN IF EXISTS "HP",
    DROP COLUMN IF EXISTS "MaxHP",
    DROP COLUMN IF EXISTS "CurrentQ",
    DROP COLUMN IF EXISTS "CurrentR";

-- ══════════════════════════════════════════════════════════════
-- D. 移除孤立的骰子 RPC 函式（dice.ts 已清空，永不再呼叫）
-- ══════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.transfer_dice(TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.transfer_golden_dice(TEXT, TEXT, INTEGER, TEXT);
`;

async function run() {
    const client = await pool.connect();
    try {
        console.log('開始清理 CharacterStats 未使用欄位...');
        await client.query(sql);
        console.log('');
        console.log('✓ A. RPG 屬性欄位已刪除（Spirit, Physique, Charisma, Savvy, Luck, Potential）');
        console.log('✓ B. 舊遊戲系統欄位已刪除（EnergyDice, GoldenDice, Coins, GameGold, GameInventory, Inventory, Role, DDA_Difficulty）');
        console.log('✓ C. 廢棄地圖欄位已刪除（Facing, HP, MaxHP, CurrentQ, CurrentR）');
        console.log('✓ D. 骰子 RPC 函式已移除（transfer_dice, transfer_golden_dice）');
        console.log('');
        console.log('共刪除 19 個欄位、2 個孤立函式。');
    } catch (e: any) {
        console.error('執行失敗：', e.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
