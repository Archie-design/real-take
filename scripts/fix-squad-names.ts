/**
 * 修正 CharacterStats.SquadName 資料
 *
 * 問題：名冊匯入時 squad_name 填的是大系統名稱（「方圓」、「地球」、「蛻變」），
 *       而非具體大隊號碼（「方圓1」、「方圓2」…），導致大隊長看到全系統成員。
 *
 * 分組規則：每 3 個小隊為一大隊（依序），大隊號碼 = ceil(小隊號碼 / 3)
 *   例：方圓1/2/3 → 大隊1（方圓1），方圓4/5/6 → 大隊2（方圓2）
 *
 * TeamName 格式：
 *   - 小隊長/一般成員：PREFIX小隊號碼-成員序  （例 「方圓7-1」）
 *   - 大隊長：         大隊長N               （例 「大隊長2」）
 *
 * 用法：
 *   npx ts-node -O '{"module":"commonjs"}' scripts/fix-squad-names.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// 「PREFIX小隊號碼-成員序」→ { prefix, squadNum }
// e.g. "方圓7-1" → { prefix: "方圓", squadNum: 7 }
// e.g. "地球23-1" → { prefix: "地球", squadNum: 23 }
function parseTeamName(teamName: string): { prefix: string; squadNum: number } | null {
    const match = teamName.match(/^([^\d]+)(\d+)-\d+$/);
    if (!match) return null;
    return { prefix: match[1], squadNum: parseInt(match[2], 10) };
}

// 「大隊長N」→ N
function parseCommandantTeamName(teamName: string): number | null {
    const match = teamName.match(/^大隊長(\d+)$/);
    if (!match) return null;
    return parseInt(match[1], 10);
}

function getBattalionNum(squadNum: number): number {
    return Math.ceil(squadNum / 3);
}

// 需要修正的裸系統名稱
const BARE_SYSTEM_NAMES = ['方圓', '地球', '蛻變'];

async function main() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. 查詢所有需要修正的 CharacterStats
        const { rows } = await client.query<{
            UserID: string;
            SquadName: string;
            TeamName: string | null;
        }>(
            `SELECT "UserID", "SquadName", "TeamName"
             FROM "CharacterStats"
             WHERE "SquadName" = ANY($1)`,
            [BARE_SYSTEM_NAMES]
        );

        console.log(`找到 ${rows.length} 筆需要修正的 CharacterStats 記錄`);

        const updates: { userId: string; oldSquadName: string; newSquadName: string }[] = [];
        const skipped: { userId: string; teamName: string | null; reason: string }[] = [];

        for (const row of rows) {
            const { UserID, SquadName, TeamName } = row;

            if (!TeamName) {
                skipped.push({ userId: UserID, teamName: null, reason: 'TeamName 為空，無法推算大隊號' });
                continue;
            }

            // 大隊長格式：大隊長N
            const commandantNum = parseCommandantTeamName(TeamName);
            if (commandantNum !== null) {
                updates.push({
                    userId: UserID,
                    oldSquadName: SquadName,
                    newSquadName: SquadName + commandantNum,
                });
                continue;
            }

            // 一般成員/小隊長格式：PREFIX小隊號碼-成員序
            const parsed = parseTeamName(TeamName);
            if (parsed) {
                const battalionNum = getBattalionNum(parsed.squadNum);
                updates.push({
                    userId: UserID,
                    oldSquadName: SquadName,
                    newSquadName: parsed.prefix + battalionNum,
                });
                continue;
            }

            skipped.push({ userId: UserID, teamName: TeamName, reason: `TeamName 格式不符（"${TeamName}"）` });
        }

        console.log(`\n將更新 ${updates.length} 筆，略過 ${skipped.length} 筆`);

        if (skipped.length > 0) {
            console.log('\n略過清單（需人工確認）：');
            for (const s of skipped) {
                console.log(`  UserID=${s.userId}  TeamName=${s.teamName ?? '(null)'}  原因：${s.reason}`);
            }
        }

        // 2. 印出變更預覽（前 20 筆）
        console.log('\n變更預覽（前 20 筆）：');
        for (const u of updates.slice(0, 20)) {
            console.log(`  UserID=${u.userId}  ${u.oldSquadName} → ${u.newSquadName}`);
        }
        if (updates.length > 20) {
            console.log(`  …（共 ${updates.length} 筆）`);
        }

        // 3. 批次更新 CharacterStats.SquadName
        let csUpdated = 0;
        for (const u of updates) {
            await client.query(
                `UPDATE "CharacterStats" SET "SquadName" = $1 WHERE "UserID" = $2`,
                [u.newSquadName, u.userId]
            );
            csUpdated++;
        }
        console.log(`\n✓ CharacterStats 已更新 ${csUpdated} 筆`);

        // 4. 同步更新 Rosters.squad_name（Rosters.phone = CharacterStats.UserID）
        const rostersResult = await client.query(
            `UPDATE "Rosters" r
             SET squad_name = cs."SquadName"
             FROM "CharacterStats" cs
             WHERE r.phone = cs."UserID"
               AND r.squad_name = ANY($1)`,
            [BARE_SYSTEM_NAMES]
        );
        console.log(`✓ Rosters 已更新 ${rostersResult.rowCount} 筆`);

        // 5. 修正 BonusApplications.battalion_name
        const bonusResult = await client.query(
            `UPDATE "BonusApplications" ba
             SET battalion_name = cs."SquadName"
             FROM "CharacterStats" cs
             WHERE ba.user_id = cs."UserID"
               AND ba.battalion_name = ANY($1)`,
            [BARE_SYSTEM_NAMES]
        );
        console.log(`✓ BonusApplications 已更新 ${bonusResult.rowCount} 筆`);

        await client.query('COMMIT');
        console.log('\n🎉 完成！所有變更已提交。');
        console.log('\n驗證步驟：');
        console.log('  1. 在 Supabase 確認林彥達（UserID=0909002211）SquadName = "方圓1"');
        console.log('  2. SELECT DISTINCT battalion_name FROM "BonusApplications" → 應無 方圓/地球/蛻變 裸名');
        console.log('  3. 登入大隊長帳號 → 製片總部，確認只看到本大隊成員');

    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('❌ 發生錯誤，已 ROLLBACK：', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
