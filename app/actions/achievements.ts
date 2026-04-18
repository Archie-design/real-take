'use server';

import { createClient } from '@supabase/supabase-js';
import { ACHIEVEMENT_CATALOG, ACHIEVEMENT_MAP, type AchievementDef } from '@/lib/achievements/catalog';
import { evaluatePredicate, filterCatalogByTriggers, type Trigger } from '@/lib/achievements/predicates';
import { logAdminAction } from '@/app/actions/admin';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getServiceClient() {
    return createClient(supabaseUrl, supabaseKey);
}

export interface UnlockedAchievement {
    id: number;
    rarity: AchievementDef['rarity'];
    hint: string;
    description: string;
    unlocked_at: string;
}

async function fetchCharacterStats(supabase: ReturnType<typeof getServiceClient>, userId: string) {
    const { data } = await supabase
        .from('CharacterStats')
        .select('Exp, Streak')
        .eq('UserID', userId)
        .single();
    return {
        Exp: parseInt(String(data?.Exp ?? 0), 10),
        Streak: parseInt(String(data?.Streak ?? 0), 10),
    };
}

async function fetchExistingUnlocks(supabase: ReturnType<typeof getServiceClient>, userId: string) {
    const { data } = await supabase
        .from('Achievements')
        .select('achievement_id')
        .eq('user_id', userId);
    return new Set<string>((data ?? []).map(r => String(r.achievement_id)));
}

/** 對 user 逐一評估 catalog（已排除已解鎖者），新達成者寫入 DB 並回傳。 */
export async function evaluateAchievements(
    userId: string,
    triggers: Trigger[] = ['all'],
): Promise<{ success: boolean; newlyUnlocked: UnlockedAchievement[]; error?: string }> {
    try {
        const supabase = getServiceClient();
        const existing = await fetchExistingUnlocks(supabase, userId);
        const charStats = await fetchCharacterStats(supabase, userId);

        const candidates = filterCatalogByTriggers(ACHIEVEMENT_CATALOG, triggers)
            .filter(def => !existing.has(String(def.id)));

        const newlyUnlocked: UnlockedAchievement[] = [];
        for (const def of candidates) {
            const res = await evaluatePredicate(supabase, userId, def, charStats);
            if (res.unlocked) {
                const nowIso = new Date().toISOString();
                const { error: insertErr } = await supabase
                    .from('Achievements')
                    .upsert({
                        user_id: userId,
                        achievement_id: String(def.id),
                        unlocked_at: nowIso,
                        unlock_source: 'auto',
                    }, { onConflict: 'user_id,achievement_id', ignoreDuplicates: true });
                if (!insertErr) {
                    newlyUnlocked.push({
                        id: def.id,
                        rarity: def.rarity,
                        hint: def.hint,
                        description: def.description,
                        unlocked_at: nowIso,
                    });
                }
            }
        }
        return { success: true, newlyUnlocked };
    } catch (e: unknown) {
        const err = e as { message?: string };
        return { success: false, newlyUnlocked: [], error: err.message || String(e) };
    }
}

export async function listUserAchievements(userId: string) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
        .from('Achievements')
        .select('achievement_id, unlocked_at, unlock_source')
        .eq('user_id', userId);
    if (error) return { success: false, error: error.message, data: [] as Array<{ achievement_id: string; unlocked_at: string; unlock_source?: string }> };
    return { success: true, data: data ?? [] };
}

/** 管理員手動解鎖 */
export async function manualUnlockAchievement(
    actor: string,
    userId: string,
    userName: string,
    achievementId: number,
) {
    const def = ACHIEVEMENT_MAP.get(achievementId);
    if (!def) return { success: false, error: '成就不存在' };

    const supabase = getServiceClient();
    const nowIso = new Date().toISOString();
    const { error } = await supabase
        .from('Achievements')
        .upsert({
            user_id: userId,
            achievement_id: String(achievementId),
            unlocked_at: nowIso,
            unlock_source: 'admin_manual',
        }, { onConflict: 'user_id,achievement_id', ignoreDuplicates: false });
    if (error) return { success: false, error: error.message };

    await logAdminAction(
        'achievement_manual_unlock',
        actor,
        userId,
        userName,
        { achievement_id: achievementId, description: def.description, rarity: def.rarity },
    );
    return { success: true };
}

/** 管理員撤銷解鎖 */
export async function manualRevokeAchievement(
    actor: string,
    userId: string,
    userName: string,
    achievementId: number,
) {
    const def = ACHIEVEMENT_MAP.get(achievementId);
    const supabase = getServiceClient();
    const { error } = await supabase
        .from('Achievements')
        .delete()
        .eq('user_id', userId)
        .eq('achievement_id', String(achievementId));
    if (error) return { success: false, error: error.message };

    await logAdminAction(
        'achievement_manual_revoke',
        actor,
        userId,
        userName,
        { achievement_id: achievementId, description: def?.description, rarity: def?.rarity },
    );
    return { success: true };
}

/** 全員重算（管理後台按鈕） */
export async function recomputeAllAchievements(actor: string) {
    try {
        const supabase = getServiceClient();
        const { data: users, error } = await supabase
            .from('CharacterStats')
            .select('UserID');
        if (error) return { success: false, error: error.message, processed: 0, newlyUnlocked: 0 };

        let processed = 0;
        let totalNew = 0;
        const CONCURRENCY = 10;
        const list = users ?? [];
        for (let i = 0; i < list.length; i += CONCURRENCY) {
            const batch = list.slice(i, i + CONCURRENCY);
            const results = await Promise.all(
                batch.map(u => evaluateAchievements(u.UserID as string, ['all'])),
            );
            for (const res of results) {
                processed++;
                if (res.success) totalNew += res.newlyUnlocked.length;
            }
        }

        await logAdminAction(
            'achievement_recompute_all',
            actor,
            undefined,
            undefined,
            { processed, new_unlocks: totalNew },
        );
        return { success: true, processed, newlyUnlocked: totalNew };
    } catch (e: unknown) {
        const err = e as { message?: string };
        return { success: false, error: err.message || String(e), processed: 0, newlyUnlocked: 0 };
    }
}

/** 管理員檢視：全員成就分佈（各成就解鎖率） */
export async function getAchievementStats() {
    const supabase = getServiceClient();
    const [unlocksRes, usersRes] = await Promise.all([
        supabase.from('Achievements').select('achievement_id'),
        supabase.from('CharacterStats').select('UserID', { count: 'exact', head: true }),
    ]);
    const totalUsers = usersRes.count ?? 0;
    const counts = new Map<string, number>();
    for (const row of unlocksRes.data ?? []) {
        const k = String(row.achievement_id);
        counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return { totalUsers, counts: Object.fromEntries(counts) };
}
