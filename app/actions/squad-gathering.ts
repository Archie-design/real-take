'use server';

import { createClient } from '@supabase/supabase-js';
import { processCheckInTransaction } from '@/app/actions/quest';
import { SQUAD_THEME_CONFIG } from '@/lib/constants';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export type GatheringCheckin = {
    userId: string;
    userName: string | null;
    checkedInAt: string;
};

export type GatheringStatus = {
    gatheringId: string;
    checkins: GatheringCheckin[];
    allMemberCount: number;
    isComplete: boolean;
};

// ── 成員掃碼報到 ──────────────────────────────────────────────────────────
export async function checkInToGathering(
    gatheringId: string,
    userId: string,
    userName: string
): Promise<{ success: boolean; error?: string; alreadyCheckedIn?: boolean }> {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase
        .from('SquadGatheringCheckins')
        .upsert(
            { gathering_id: gatheringId, user_id: userId, user_name: userName },
            { onConflict: 'gathering_id,user_id', ignoreDuplicates: true }
        );

    if (error) {
        // 已報到（unique constraint）視為成功
        if (error.code === '23505') return { success: true, alreadyCheckedIn: true };
        return { success: false, error: '報到失敗：' + error.message };
    }
    return { success: true };
}

// ── 查詢某場定聚的到場狀況 ───────────────────────────────────────────────
export async function getGatheringStatus(
    gatheringId: string,
    allMemberCount: number
): Promise<{ success: boolean; status?: GatheringStatus; error?: string }> {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
        .from('SquadGatheringCheckins')
        .select('user_id, user_name, checked_in_at')
        .eq('gathering_id', gatheringId)
        .order('checked_in_at', { ascending: true });

    if (error) return { success: false, error: error.message };

    const checkins: GatheringCheckin[] = (data || []).map(r => ({
        userId: r.user_id,
        userName: r.user_name,
        checkedInAt: r.checked_in_at,
    }));

    return {
        success: true,
        status: {
            gatheringId,
            checkins,
            allMemberCount,
            isComplete: checkins.length >= allMemberCount,
        },
    };
}

// ── 小隊長確認全員到齊，發放 +2000 加成給所有報到成員 ──────────────────
export async function awardGatheringFullBonus(
    gatheringId: string,
    themeId: 'sq1' | 'sq2' | 'sq3' | 'sq4'
): Promise<{ success: boolean; awarded: number; errors: string[] }> {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const theme = SQUAD_THEME_CONFIG.find(t => t.id === themeId);
    if (!theme) return { success: false, awarded: 0, errors: ['找不到主題設定'] };

    // 取得所有報到成員
    const { data, error } = await supabase
        .from('SquadGatheringCheckins')
        .select('user_id, user_name')
        .eq('gathering_id', gatheringId);

    if (error) return { success: false, awarded: 0, errors: [error.message] };

    const members = data || [];
    const questId = `${themeId}_full`;
    const questTitle = `${theme.title} 全員到齊加成`;
    const reward = theme.bonusFull;

    const errors: string[] = [];
    let awarded = 0;

    for (const member of members) {
        const res = await processCheckInTransaction(
            member.user_id,
            questId,
            questTitle,
            reward
        );
        if (!res.success) {
            // 已入帳（重複）視為成功，不算錯誤
            if (res.error?.includes('已完成') || res.error?.includes('已達上限')) continue;
            errors.push(`${member.user_name ?? member.user_id}: ${res.error}`);
        } else {
            awarded++;
        }
    }

    return { success: true, awarded, errors };
}

// ── 查詢用戶個人的報到紀錄（供掃碼落地頁確認）────────────────────────────
export async function getUserGatheringCheckin(
    gatheringId: string,
    userId: string
): Promise<{ checkedIn: boolean }> {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data } = await supabase
        .from('SquadGatheringCheckins')
        .select('id')
        .eq('gathering_id', gatheringId)
        .eq('user_id', userId)
        .maybeSingle();
    return { checkedIn: !!data };
}
