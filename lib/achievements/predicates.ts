// ============================================================
// 成就條件判斷引擎
// 純查詢層：每個 predicate 回傳 { current, target } 或 boolean（達成），
// 不寫入 Achievements 表（寫入交給 server action）。
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateLevelFromExp } from '@/lib/constants';
import type { AchievementDef } from './catalog';

export interface PredicateResult {
    unlocked: boolean;
    current: number;      // 目前進度（用於 UI 顯示）
    target: number;       // 目標值
}

/** 從 DailyLogs 計算特定 quest_ids 的「列數」（每一次 check-in = 1 次）。 */
async function countQuestLogs(
    supabase: SupabaseClient,
    userId: string,
    questIds: string[],
): Promise<number> {
    if (questIds.length === 0) return 0;
    // quest_ids 可能含 w/t/b 等前綴的 compound id（如 'w4|2026-04-18|...'），
    // 但 catalog 中所有 count 類型目前只用 q/r/a/t2/w1/w3 純代號 → 用 IN 即可。
    const { count, error } = await supabase
        .from('DailyLogs')
        .select('id', { count: 'exact', head: true })
        .eq('UserID', userId)
        .in('QuestID', questIds);
    if (error) throw new Error(`countQuestLogs failed: ${error.message}`);
    return count ?? 0;
}

/** 計算特定 quest_ids 在多少「不同邏輯日」出現過。 */
async function countDistinctLogicalDays(
    supabase: SupabaseClient,
    userId: string,
    questIds: string[],
): Promise<number> {
    if (questIds.length === 0) return 0;
    const { data, error } = await supabase
        .from('DailyLogs')
        .select('Timestamp')
        .eq('UserID', userId)
        .in('QuestID', questIds);
    if (error) throw new Error(`countDistinctLogicalDays failed: ${error.message}`);
    const days = new Set<string>();
    for (const row of data ?? []) {
        const ts = new Date(row.Timestamp as string);
        // 台北時間中午 12:00 前算前一日
        const taipei = new Date(ts.getTime() + 8 * 3600 * 1000);
        const offset = taipei.getUTCHours() < 12 ? -1 : 0;
        const d = new Date(taipei.getTime() + offset * 86400 * 1000);
        days.add(d.toISOString().slice(0, 10));
    }
    return days.size;
}

/** 計算「今天或昨天為結尾」的連續邏輯日數，可過濾 quest_ids。 */
async function currentStreak(
    supabase: SupabaseClient,
    userId: string,
    questIds: string[] | null,   // null = 任一 q/r 定課
): Promise<number> {
    let query = supabase
        .from('DailyLogs')
        .select('Timestamp, QuestID')
        .eq('UserID', userId);

    if (questIds && questIds.length > 0) {
        query = query.in('QuestID', questIds);
    }
    const { data, error } = await query;
    if (error) throw new Error(`currentStreak failed: ${error.message}`);

    const days = new Set<string>();
    for (const row of data ?? []) {
        const qid = row.QuestID as string;
        // 若 questIds 為 null，僅計算 q/r 前綴的定課
        if (!questIds && !/^(q|r)/.test(qid)) continue;
        const ts = new Date(row.Timestamp as string);
        const taipei = new Date(ts.getTime() + 8 * 3600 * 1000);
        const offset = taipei.getUTCHours() < 12 ? -1 : 0;
        const d = new Date(taipei.getTime() + offset * 86400 * 1000);
        days.add(d.toISOString().slice(0, 10));
    }

    if (days.size === 0) return 0;

    // 今天（邏輯日）
    const nowTaipei = new Date(Date.now() + 8 * 3600 * 1000);
    const todayOffset = nowTaipei.getUTCHours() < 12 ? -1 : 0;
    const today = new Date(nowTaipei.getTime() + todayOffset * 86400 * 1000);
    const todayStr = today.toISOString().slice(0, 10);

    // 從今天或昨天開始往回數
    let streak = 0;
    let cursor = new Date(today);
    if (!days.has(todayStr)) {
        // 若今天沒打，改從昨天開始試
        cursor = new Date(cursor.getTime() - 86400 * 1000);
        if (!days.has(cursor.toISOString().slice(0, 10))) {
            return 0;
        }
    }
    while (days.has(cursor.toISOString().slice(0, 10))) {
        streak++;
        cursor = new Date(cursor.getTime() - 86400 * 1000);
    }
    return streak;
}

/** 計算同一邏輯日完成了多少個不同的 quest_id。 */
async function maxDistinctQuestsInOneDay(
    supabase: SupabaseClient,
    userId: string,
): Promise<number> {
    const { data, error } = await supabase
        .from('DailyLogs')
        .select('Timestamp, QuestID')
        .eq('UserID', userId);
    if (error) throw new Error(`maxDistinctQuestsInOneDay failed: ${error.message}`);
    const perDay = new Map<string, Set<string>>();
    for (const row of data ?? []) {
        const qid = row.QuestID as string;
        // 僅計算定課（q/r 開頭）
        if (!/^(q|r)/.test(qid)) continue;
        const ts = new Date(row.Timestamp as string);
        const taipei = new Date(ts.getTime() + 8 * 3600 * 1000);
        const offset = taipei.getUTCHours() < 12 ? -1 : 0;
        const d = new Date(taipei.getTime() + offset * 86400 * 1000);
        const dstr = d.toISOString().slice(0, 10);
        if (!perDay.has(dstr)) perDay.set(dstr, new Set());
        // 把 q1 和 q1_dawn 視為同一個（打拳一次）
        const normalized = qid === 'q1_dawn' ? 'q1' : qid;
        perDay.get(dstr)!.add(normalized);
    }
    let max = 0;
    perDay.forEach(s => { if (s.size > max) max = s.size; });
    return max;
}

/** BonusApplications 中指定 quest_ids 且 status='approved' 的筆數。 */
async function countBonusApproved(
    supabase: SupabaseClient,
    userId: string,
    questIds: string[],
): Promise<number> {
    if (questIds.length === 0) return 0;
    // quest_id 可能為 'b2' 或 'b2|2026-04-18|對象'；以「主代號」判斷
    const { data, error } = await supabase
        .from('BonusApplications')
        .select('quest_id, status')
        .eq('user_id', userId)
        .eq('status', 'approved');
    if (error) throw new Error(`countBonusApproved failed: ${error.message}`);
    let count = 0;
    const set = new Set(questIds);
    for (const row of data ?? []) {
        const qid = String(row.quest_id ?? '');
        const main = qid.includes('|') ? qid.split('|')[0] : qid;
        if (set.has(main)) count++;
    }
    return count;
}

export async function evaluatePredicate(
    supabase: SupabaseClient,
    userId: string,
    def: AchievementDef,
    charStats: { Exp: number; Streak: number } | null,
): Promise<PredicateResult> {
    const p = def.predicate;
    switch (p.kind) {
        case 'quest_count_total': {
            const current = await countQuestLogs(supabase, userId, p.quest_ids ?? []);
            const target = p.min ?? 1;
            return { unlocked: current >= target, current, target };
        }
        case 'quest_first': {
            const current = await countQuestLogs(supabase, userId, p.quest_ids ?? []);
            return { unlocked: current >= 1, current: Math.min(current, 1), target: 1 };
        }
        case 'quest_same_day': {
            const current = await maxDistinctQuestsInOneDay(supabase, userId);
            const target = p.min_distinct ?? 3;
            return { unlocked: current >= target, current, target };
        }
        case 'quest_distinct_days': {
            const current = await countDistinctLogicalDays(supabase, userId, p.quest_ids ?? []);
            const target = p.min ?? 1;
            return { unlocked: current >= target, current, target };
        }
        case 'streak_any_quest': {
            // 用 DB 欄位 Streak（每日 cron 更新）為準；若尚未跑過 cron 則即時計算
            const target = p.min ?? 7;
            const dbStreak = charStats?.Streak ?? 0;
            const current = dbStreak > 0 ? dbStreak : await currentStreak(supabase, userId, null);
            return { unlocked: current >= target, current, target };
        }
        case 'streak_specific_quest': {
            const target = p.min ?? 3;
            const current = await currentStreak(supabase, userId, p.quest_ids ?? []);
            return { unlocked: current >= target, current, target };
        }
        case 'exp_min': {
            const target = p.min ?? 0;
            const current = charStats?.Exp ?? 0;
            return { unlocked: current >= target, current, target };
        }
        case 'level_min': {
            const target = p.min ?? 1;
            const current = calculateLevelFromExp(charStats?.Exp ?? 0);
            return { unlocked: current >= target, current, target };
        }
        case 'bonus_approved': {
            const current = await countBonusApproved(supabase, userId, p.quest_ids ?? []);
            const target = p.min ?? 1;
            return { unlocked: current >= target, current, target };
        }
    }
}

/** 根據 trigger 類型過濾 catalog（減少不必要查詢）。 */
export type Trigger = 'quest' | 'bonus' | 'flag' | 'streak' | 'all';

export function filterCatalogByTriggers(
    catalog: AchievementDef[],
    triggers: Trigger[],
): AchievementDef[] {
    if (triggers.includes('all')) return catalog;
    return catalog.filter(def => {
        const k = def.predicate.kind;
        if (triggers.includes('quest')) {
            if (k === 'quest_count_total' || k === 'quest_first' || k === 'quest_same_day' ||
                k === 'quest_distinct_days' || k === 'streak_specific_quest' ||
                k === 'exp_min' || k === 'level_min') return true;
        }
        if (triggers.includes('bonus')) {
            if (k === 'bonus_approved' || k === 'exp_min' || k === 'level_min') return true;
        }
        if (triggers.includes('streak')) {
            if (k === 'streak_any_quest') return true;
        }
        if (triggers.includes('flag')) {
            if (k === 'bonus_approved') return true;
        }
        return false;
    });
}
