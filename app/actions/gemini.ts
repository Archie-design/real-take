'use server';

import { GoogleGenAI } from '@google/genai';
import { connectDb } from '@/lib/db';
import { getWeeklyMonday } from '@/lib/utils/time';
import type { WeeklyReview, CaptainBriefing } from '@/types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generatePersonalizedEncounter(userId: string) {
    if (!process.env.GEMINI_API_KEY) {
        return { success: false, error: "GEMINI_API_KEY 未設定，無法生成動態遭遇。" };
    }

    
    const client = await connectDb();

    try {
        // 1. Fetch User Stats
        const statsRes = await client.query(`SELECT * FROM "CharacterStats" WHERE "UserID" = $1`, [userId]);
        if (statsRes.rowCount === 0) throw new Error("無效的使用者");
        const user = statsRes.rows[0];

        // 2. Fetch last 7 days Logs
        const past7Date = new Date();
        past7Date.setDate(past7Date.getDate() - 7);
        const logsRes = await client.query(`
            SELECT "QuestID", "QuestTitle", "Timestamp" FROM "DailyLogs" 
            WHERE "UserID" = $1 AND "Timestamp" >= $2
            ORDER BY "Timestamp" ASC
        `, [userId, past7Date.toISOString()]);

        const logs = logsRes.rows;

        // 3. Prepare AI Prompt
        const prompt = `
你是一位《星光西遊》遊戲的動態難度生成器 (DDA)。這款遊戲的核心在於「藉假修真」，結合現實生活中的習慣養成與遊戲內的數值成長。
目前有一名玩家觸發了「動態遭遇」，請根據他/她過去 7 天的定課紀錄與角色數值，生成一個高度客製化的事件（隨機在地圖鄰近格子生成一個 NPC 或怪物，伴隨對話與獎勵/懲罰）。

【玩家資訊】
姓名：${user.Name}
角色定位：${user.Role} (Level ${user.Level}, 經驗值 ${user.Exp})
目前屬性：
- 根骨 (Physique): ${user.Physique}
- 神識 (Spirit): ${user.Spirit}
- 魅力 (Charisma): ${user.Charisma}
- 悟性 (Savvy): ${user.Savvy}
- 機緣 (Luck): ${user.Luck}
- 潛力 (Potential): ${user.Potential}

【近 7 天定課紀錄】
總完成次數：${logs.length} / 21
詳細紀錄：
${logs.map(l => `- ${new Date(l.Timestamp).toLocaleDateString()} : ${l.QuestTitle}`).join('\n')}

【生成要求】
1. 分析該玩家是屬於「精進者 (高頻率打卡)」還是「懈怠者 (低頻率或中斷打卡)」。
2. 精進者：生成「正向奇遇」或「精英挑戰」。對話應充滿敬意與激勵。
3. 懈怠者：生成「心魔」或「障礙」。對話應帶有當頭棒喝、提醒其現實痛點的感覺。
4. **致命弱點設計**：識別玩家六維屬性中的**最低項**。如果生成怪物，該怪物的攻擊必須設計為專攻該弱點。
5. **等級與數值**：
   - 必勝心魔怪：等級應低於玩家，對話帶有溫暖提示。
   - 精英挑戰怪：等級可高於玩家，對話充滿挑釁。
6. 絕對不可修改「Exp (修為)」。

請嚴格回傳一個格式正確的純 JSON 字串，不要使用 Markdown 標籤，格式如下：
{
  "encounterName": "遭遇名稱",
  "encounterType": "monster" | "npc" | "treasure",
  "level": 15, // 建議等級
  "hp": 500, // 怪物生命值 (若為怪物)
  "narrative": "50 字左右描述",
  "dialogue": "NPC 或心魔台詞",
  "targetStat": "神識" | "根骨" | "魅力" | "悟性" | "機緣" | "潛力", // 針對的弱點
  "effect": {
    "statToModify": "EnergyDice" | "Physique" | "Spirit" | "Charisma" | "Savvy" | "Luck" | "Potential",
    "value": 10
  }
}
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                // Ensure structured JSON output
                responseMimeType: "application/json",
            }
        });

        const textResponse = response.text;
        if (!textResponse) throw new Error("AI 未回應內容");

        const encounterData = JSON.parse(textResponse);

        // Persist the AI encounter as a MapEntities record near the player
        let entityId: string | null = null;
        if (encounterData.encounterType === 'monster' || encounterData.encounterType === 'npc') {
            try {
                // Place on a random adjacent hex (one of 6 axial directions)
                const directions = [
                    { dq: 1, dr: 0 }, { dq: -1, dr: 0 },
                    { dq: 0, dr: 1 }, { dq: 0, dr: -1 },
                    { dq: 1, dr: -1 }, { dq: -1, dr: 1 }
                ];
                const dir = directions[Math.floor(Math.random() * directions.length)];
                const eq = (user.CurrentQ || 0) + dir.dq;
                const er = (user.CurrentR || 0) + dir.dr;

                const icon = encounterData.encounterType === 'monster' ? '👹' : '🧙';
                const insertRes = await client.query(`
                    INSERT INTO "MapEntities" (q, r, type, name, icon, data, owner_id, is_active)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, true)
                    RETURNING id
                `, [
                    eq, er,
                    encounterData.encounterType,
                    encounterData.encounterName,
                    icon,
                    JSON.stringify({
                        level: encounterData.level,
                        hp: encounterData.hp,
                        type: 'demon',
                        narrative: encounterData.narrative,
                        dialogue: encounterData.dialogue,
                        targetStat: encounterData.targetStat,
                        effect: encounterData.effect,
                    }),
                    userId
                ]);
                entityId = insertRes.rows[0]?.id ?? null;
            } catch (_) { /* non-critical: log but don't fail */ }
        }

        return { success: true, encounter: encounterData, entityId };

    } catch (error: any) {
        console.error("Gemini DDA Error:", error);
        return { success: false, error: error.message };
    } finally {
        await client.end();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI 修行週報
// ─────────────────────────────────────────────────────────────────────────────
export async function generateWeeklyReview(
    userId: string
): Promise<{ success: boolean; review?: WeeklyReview; weekLabel?: string; error?: string }> {
    if (!process.env.GEMINI_API_KEY) {
        return { success: false, error: 'GEMINI_API_KEY 未設定' };
    }

    const client = await connectDb();
    try {
        // 1. Fetch user stats
        const statsRes = await client.query(`SELECT * FROM "CharacterStats" WHERE "UserID" = $1`, [userId]);
        if (statsRes.rowCount === 0) throw new Error('無效的使用者');
        const user = statsRes.rows[0];

        // 2. Compute week boundaries (using Taiwan-aware Monday)
        const now = new Date();
        // Convert current time to Taiwan time to get the correct Monday
        const twFormatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Taipei',
            year: 'numeric', month: '2-digit', day: '2-digit',
        });
        const twDateStr = twFormatter.format(now); // YYYY-MM-DD in TW time
        const twDate = new Date(twDateStr + 'T00:00:00');
        const thisWeekMonday = getWeeklyMonday(twDate);
        const prevWeekMonday = new Date(thisWeekMonday);
        prevWeekMonday.setDate(prevWeekMonday.getDate() - 7);
        const nextWeekMonday = new Date(thisWeekMonday);
        nextWeekMonday.setDate(nextWeekMonday.getDate() + 7);

        const weekLabel = thisWeekMonday.toISOString().slice(0, 10);

        // 3. Fetch this week's daily quest logs (q1~q7 only)
        const thisLogsRes = await client.query(`
            SELECT "QuestTitle", "Timestamp" FROM "DailyLogs"
            WHERE "UserID" = $1
              AND "Timestamp" >= $2 AND "Timestamp" < $3
              AND "QuestID" LIKE 'q%'
            ORDER BY "Timestamp" ASC
        `, [userId, thisWeekMonday.toISOString(), nextWeekMonday.toISOString()]);

        // 4. Fetch previous week's daily quest logs
        const prevLogsRes = await client.query(`
            SELECT "QuestTitle", "Timestamp" FROM "DailyLogs"
            WHERE "UserID" = $1
              AND "Timestamp" >= $2 AND "Timestamp" < $3
              AND "QuestID" LIKE 'q%'
        `, [userId, prevWeekMonday.toISOString(), thisWeekMonday.toISOString()]);

        const thisLogs = thisLogsRes.rows;
        const prevLogs = prevLogsRes.rows;

        // 5. Derive trend and weakest stat
        const thisRate = thisLogs.length / 21;
        const prevRate = prevLogs.length / 21;
        const delta = thisRate - prevRate;
        const trend: 'up' | 'down' | 'stable' =
            delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'stable';

        const statMap: Record<string, number> = {
            '根骨': user.Physique, '神識': user.Spirit, '魅力': user.Charisma,
            '悟性': user.Savvy, '機緣': user.Luck, '潛力': user.Potential,
        };
        const weakestStatName = Object.entries(statMap).sort((a, b) => a[1] - b[1])[0][0];

        const trendLabel = trend === 'up' ? '精進中 ↑' : trend === 'down' ? '懈怠中 ↓' : '持平 →';
        const thisWeekMondayStr = thisWeekMonday.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' });

        const prompt = `
你是《星光西遊》的「洞天福地覆盤官」。這款遊戲鼓勵玩家藉由現實生活的習慣養成來獲得修為成長。
每週一，你需要為每位修行者撰寫一份「修行週報」，回顧他們上週的定課完成情況，並給予有溫度的鼓勵或棒喝。

【修行者資訊】
姓名：${user.Name}
角色定位：${user.Role}（第 ${user.Level} 層，修為 ${user.Exp}）
六維屬性：根骨 ${user.Physique} ／ 神識 ${user.Spirit} ／ 魅力 ${user.Charisma} ／ 悟性 ${user.Savvy} ／ 機緣 ${user.Luck} ／ 潛力 ${user.Potential}
最弱屬性：${weakestStatName}

【本週定課紀錄 (${thisWeekMondayStr} 起)】
完成次數：${thisLogs.length} / 21（完成率 ${Math.round(thisRate * 100)}%）
詳細：
${thisLogs.map(l => `- ${new Date(l.Timestamp).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}：${l.QuestTitle}`).join('\n') || '（本週尚無打卡紀錄）'}

【上週定課紀錄】
完成次數：${prevLogs.length} / 21（完成率 ${Math.round(prevRate * 100)}%）

【週間趨勢】：${trendLabel}

【撰寫要求】
1. summary（約 80–100 字）：用第二人稱「你」，結合玩家的最弱屬性與本週完成情況，給予個人化的修行覆盤。語氣根據完成率調整：高（>70%）→ 鼓舞精進；中（40–70%）→ 溫和提醒；低（<40%）→ 當頭棒喝但不失溫度。
2. quote（一句話，15–30 字）：引用一句《西遊記》、道家思想的箴言或自創修行金句，與本週狀態呼應。
3. trend：直接回傳 "up"、"down" 或 "stable"（英文，勿翻譯）。
4. weeklyRate：本週完成率，0 到 1 之間的小數（例如 0.67）。

請嚴格回傳格式正確的純 JSON，不使用 Markdown 標籤：
{
  "summary": "...",
  "quote": "...",
  "trend": "up",
  "weeklyRate": 0.67
}
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' },
        });

        const textResponse = response.text;
        if (!textResponse) throw new Error('AI 未回應內容');
        const review: WeeklyReview = JSON.parse(textResponse);
        // Ensure trend is one of the valid values
        if (!['up', 'down', 'stable'].includes(review.trend)) review.trend = trend;

        // 6. Upsert to WeeklyReviews
        await client.query(`
            INSERT INTO "WeeklyReviews" (user_id, week_label, content)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, week_label) DO UPDATE SET content = EXCLUDED.content
        `, [userId, weekLabel, JSON.stringify(review)]);

        return { success: true, review, weekLabel };

    } catch (error: any) {
        console.error('Weekly Review Error:', error);
        return { success: false, error: error.message };
    } finally {
        await client.end();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI 隊長建議
// ─────────────────────────────────────────────────────────────────────────────
export async function generateCaptainBriefing(
    captainUserId: string
): Promise<{ success: boolean; briefing?: CaptainBriefing; error?: string }> {
    if (!process.env.GEMINI_API_KEY) {
        return { success: false, error: 'GEMINI_API_KEY 未設定' };
    }

    const client = await connectDb();
    try {
        // 1. Verify captain + get team name
        const captainRes = await client.query(
            `SELECT "TeamName", "IsCaptain", "Name" FROM "CharacterStats" WHERE "UserID" = $1`,
            [captainUserId]
        );
        if (captainRes.rowCount === 0) throw new Error('無效的使用者');
        const captain = captainRes.rows[0];
        if (!captain.IsCaptain) return { success: false, error: '非隊長無法使用此功能' };
        if (!captain.TeamName) return { success: false, error: '尚未分配小隊' };

        // 2. Fetch all team members
        const membersRes = await client.query(
            `SELECT * FROM "CharacterStats" WHERE "TeamName" = $1 ORDER BY "Level" DESC`,
            [captain.TeamName]
        );
        const members = membersRes.rows;
        if (members.length === 0) return { success: false, error: '小隊目前無成員' };

        // 3. Batch-fetch last 7 days logs for all members (avoid N+1)
        const past7Date = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
        const memberIds = members.map((m: any) => m.UserID);
        const logsRes = await client.query(`
            SELECT "UserID", "QuestTitle", "Timestamp" FROM "DailyLogs"
            WHERE "UserID" = ANY($1::text[])
              AND "Timestamp" >= $2
              AND "QuestID" LIKE 'q%'
            ORDER BY "UserID", "Timestamp" ASC
        `, [memberIds, past7Date]);

        // 4. Group logs by UserID
        const logsByUser = new Map<string, any[]>();
        for (const log of logsRes.rows) {
            if (!logsByUser.has(log.UserID)) logsByUser.set(log.UserID, []);
            logsByUser.get(log.UserID)!.push(log);
        }

        // 5. Compute team average + identify top/support
        const memberStats = members.map((m: any) => ({
            name: m.Name,
            role: m.Role,
            level: m.Level,
            count: logsByUser.get(m.UserID)?.length ?? 0,
            rate: (logsByUser.get(m.UserID)?.length ?? 0) / 21,
        }));
        const teamAvgRate = memberStats.reduce((s: number, m: any) => s + m.rate, 0) / memberStats.length;
        const teamMorale: 'high' | 'medium' | 'low' =
            teamAvgRate > 0.7 ? 'high' : teamAvgRate >= 0.4 ? 'medium' : 'low';

        const prompt = `
你是《星光西遊》的「洞天軍情分析師」，專為小隊隊長提供隊務報告。
請根據以下資料，對小隊過去 7 天的修行表現進行分析，並給予隊長具體可行的建議。

【小隊資訊】
小隊名稱：${captain.TeamName}
隊長：${captain.Name}
隊員人數：${members.length} 人

【各隊員近 7 天定課表現】
${memberStats.map((m: any) => `- ${m.name}（${m.role}，Lv${m.level}）：完成 ${m.count}/21 次（${Math.round(m.rate * 100)}%）`).join('\n')}

【小隊平均完成率】：${Math.round(teamAvgRate * 100)}%

【生成要求】
1. teamSummary（約 80–100 字）：整體評述小隊本週士氣與表現，使用第二人稱「你的小隊」向隊長說話，語氣如資深修行導師。
2. topPerformer（格式：「姓名：一句鼓勵語（15 字以內）」）：本週完成率最高的隊員。若並列取 Level 較高者。
3. needsSupport（陣列）：完成率低於 33% 的隊員姓名，若無則回傳空陣列 []。
4. suggestion（約 50 字）：針對小隊整體狀態給隊長一個本週具體行動建議（如何互相提醒、設置儀式等）。
5. teamMorale：根據平均完成率判斷，高（>70%）→ "high"；中（40–70%）→ "medium"；低（<40%）→ "low"（英文）。

請嚴格回傳格式正確的純 JSON，不使用 Markdown 標籤：
{
  "teamSummary": "...",
  "topPerformer": "姓名：鼓勵語",
  "needsSupport": [],
  "suggestion": "...",
  "teamMorale": "high"
}
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' },
        });

        const textResponse = response.text;
        if (!textResponse) throw new Error('AI 未回應內容');
        const briefing: CaptainBriefing = JSON.parse(textResponse);
        if (!['high', 'medium', 'low'].includes(briefing.teamMorale)) briefing.teamMorale = teamMorale;

        return { success: true, briefing };

    } catch (error: any) {
        console.error('Captain Briefing Error:', error);
        return { success: false, error: error.message };
    } finally {
        await client.end();
    }
}
