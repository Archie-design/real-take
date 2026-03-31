'use server';

import { createClient } from '@supabase/supabase-js';
import { BonusApplication } from '@/types';
import { processCheckInTransaction } from '@/app/actions/quest';
import { logAdminAction } from '@/app/actions/admin';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ── 隊員：提交電影推廣申請（訪談 w4 系列）─────────────────────────────────────
export async function submitInterviewApplication(
    userId: string,
    userName: string,
    squadName: string | null,
    battalionName: string | null,
    interviewTarget: string,
    interviewDate: string,      // YYYY-MM-DD
    description: string = ''
) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    // questId includes target so each person's interview is a distinct check-in record
    const questId = `w4|${interviewDate}|${interviewTarget.trim().slice(0, 50)}`;

    // 防止對同一對象在同一天重複提交（同一天可以電影推廣多人，但同一對象不能重複）
    const { data: existing } = await supabase
        .from('BonusApplications')
        .select('id, status')
        .eq('user_id', userId)
        .eq('interview_date', interviewDate)
        .eq('interview_target', interviewTarget.trim())
        .neq('status', 'rejected')
        .maybeSingle();

    if (existing) {
        return { success: false, error: `已有「${interviewTarget.trim()}」的同日申請（待審或已核准），無法重複提交` };
    }

    const { data, error } = await supabase
        .from('BonusApplications')
        .insert({
            user_id: userId,
            user_name: userName,
            squad_name: squadName,
            battalion_name: battalionName,
            interview_target: interviewTarget,
            interview_date: interviewDate,
            description,
            quest_id: questId,
            status: 'pending',
        })
        .select()
        .single();

    if (error) return { success: false, error: '提交失敗：' + error.message };
    return { success: true, application: data as BonusApplication };
}

// ── b3–b7 獎勵對照表 ─────────────────────────────────────
const BONUS_QUEST_CONFIG: Record<string, { reward: number; title: string }> = {
    b3: { reward: 5000, title: '續報高階/五運班加分' },
    b4: { reward: 5000, title: '成為小天使加分' },
    b5: { reward: 3000, title: '報名聯誼會（1年）加分' },
    b6: { reward: 5000, title: '報名聯誼會（2年）加分' },
    b7: { reward: 1000, title: '參加實體課程加分' },
};

// ── 劇組長：初審 ─────────────────────────────────────────
// b5/b6（聯誼會）：初審通過後直接入帳，不需大隊長終審
// w4（電影推廣訪談）：初審通過後進入大隊長終審佇列
export async function reviewBonusBySquadLeader(
    appId: string,
    reviewerId: string,
    approve: boolean,
    notes: string = ''
) {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 驗證審核者為劇組長，且與申請人同劇組
    const { data: reviewer } = await supabase
        .from('CharacterStats')
        .select('IsCaptain, TeamName, Name')
        .eq('UserID', reviewerId)
        .single();

    if (!reviewer?.IsCaptain) return { success: false, error: '僅限劇組長進行初審' };

    const { data: app } = await supabase
        .from('BonusApplications')
        .select('*')
        .eq('id', appId)
        .single();

    if (!app) return { success: false, error: '找不到申請記錄' };
    if (app.status !== 'pending') return { success: false, error: '此申請已被審核，無法重複操作' };
    if (app.squad_name !== reviewer.TeamName) return { success: false, error: '只能審核本劇組的申請' };

    if (!approve) {
        const { error } = await supabase
            .from('BonusApplications')
            .update({
                status: 'rejected',
                squad_review_by: reviewerId,
                squad_review_at: new Date().toISOString(),
                squad_review_notes: notes,
            })
            .eq('id', appId);

        if (error) return { success: false, error: '審核更新失敗：' + error.message };
        return { success: true, newStatus: 'rejected' };
    }

    // b5/b6 聯誼會：小隊長初審即最終核准，直接入帳
    const isNetworkingEvent = app.quest_id === 'b5' || app.quest_id === 'b6';

    if (isNetworkingEvent) {
        const bonusInfo = BONUS_QUEST_CONFIG[app.quest_id];

        const { error: updateErr } = await supabase
            .from('BonusApplications')
            .update({
                status: 'approved',
                squad_review_by: reviewerId,
                squad_review_at: new Date().toISOString(),
                squad_review_notes: notes,
                final_review_by: reviewer.Name,
                final_review_at: new Date().toISOString(),
            })
            .eq('id', appId);

        if (updateErr) return { success: false, error: '審核更新失敗：' + updateErr.message };

        const checkInRes = await processCheckInTransaction(
            app.user_id,
            app.quest_id,
            bonusInfo.title,
            bonusInfo.reward
        );

        if (!checkInRes.success) {
            await logAdminAction('b5b6_squad_approve', reviewer.Name, appId, app.user_name, {
                questId: app.quest_id,
                checkInError: checkInRes.error,
            }, 'error');
            return { success: true, warning: '審核已核准，但入帳失敗：' + checkInRes.error };
        }

        await logAdminAction('b5b6_squad_approve', reviewer.Name, appId, app.user_name, {
            questId: app.quest_id,
            reward: bonusInfo.reward,
        });

        return { success: true, newStatus: 'approved' };
    }

    // 其他類型（w4 電影推廣訪談）：進入大隊長終審佇列
    const { error } = await supabase
        .from('BonusApplications')
        .update({
            status: 'squad_approved',
            squad_review_by: reviewerId,
            squad_review_at: new Date().toISOString(),
            squad_review_notes: notes,
        })
        .eq('id', appId);

    if (error) return { success: false, error: '審核更新失敗：' + error.message };
    return { success: true, newStatus: 'squad_approved' };
}

// ── 大隊長：終審（僅用於 w4 電影推廣訪談）──────────────────────────────────────
export async function reviewBonusByAdmin(
    appId: string,
    action: 'approve' | 'reject',
    notes: string = '',
    reviewerName: string = 'admin'
) {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: app } = await supabase
        .from('BonusApplications')
        .select('*')
        .eq('id', appId)
        .single();

    if (!app) return { success: false, error: '找不到申請記錄' };
    if (app.status !== 'squad_approved') return { success: false, error: '此申請尚未通過劇組長初審' };

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const { error: updateErr } = await supabase
        .from('BonusApplications')
        .update({
            status: newStatus,
            final_review_by: reviewerName,
            final_review_at: new Date().toISOString(),
            final_review_notes: notes,
        })
        .eq('id', appId);

    if (updateErr) return { success: false, error: '終審更新失敗：' + updateErr.message };

    if (action === 'approve') {
        const questIdBase = app.quest_id.split('|')[0];
        const bonusInfo = BONUS_QUEST_CONFIG[questIdBase];
        const reward = bonusInfo ? bonusInfo.reward : 1000;
        const rewardTitle = bonusInfo ? bonusInfo.title : '星光電影推廣獎勵';

        const checkInRes = await processCheckInTransaction(
            app.user_id,
            app.quest_id,
            rewardTitle,
            reward
        );
        if (!checkInRes.success) {
            await logAdminAction('bonus_final_approve', reviewerName, appId, app.user_name, {
                interviewTarget: app.interview_target,
                questId: app.quest_id,
                checkInError: checkInRes.error,
            }, 'error');
            return { success: true, warning: '審核已核准，但入帳失敗：' + checkInRes.error };
        }
        await logAdminAction('bonus_final_approve', reviewerName, appId, app.user_name, {
            interviewTarget: app.interview_target,
            questId: app.quest_id,
            reward,
        });
    } else {
        await logAdminAction('bonus_final_reject', reviewerName, appId, app.user_name, {
            interviewTarget: app.interview_target,
            notes,
        });
    }

    return { success: true, newStatus };
}

// ── 學員：提交 b3–b7 加分申請 ──────────────────────────────
export async function submitBonusApplication(
    userId: string,
    userName: string,
    squadName: string | null,
    battalionName: string | null,
    bonusType: 'b3' | 'b4' | 'b5' | 'b6' | 'b7',
    target: string,      // 申請描述（課程名稱 / 聯誼會 / 課程日期…）
    date: string,        // YYYY-MM-DD
    description: string = '',
    screenshotUrl?: string  // b5/b6 的截圖 URL
) {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // b3、b4、b5、b6 每人只能申請一次（未被駁回的情況下）
    if (['b3', 'b4', 'b5', 'b6'].includes(bonusType)) {
        const { data: existing } = await supabase
            .from('BonusApplications')
            .select('id, status')
            .eq('user_id', userId)
            .eq('quest_id', bonusType)
            .neq('status', 'rejected')
            .maybeSingle();

        if (existing) {
            return { success: false, error: `${BONUS_QUEST_CONFIG[bonusType].title} 已有申請記錄，無法重複提交` };
        }
    }

    // b7 每次課程日期不同，quest_id 帶日期以允許多次申請
    const questId = bonusType === 'b7' ? `b7|${date}` : bonusType;

    // b5、b6 需要截圖，送小隊長初審；其他直接進入大隊長終審
    const status = (bonusType === 'b5' || bonusType === 'b6') ? 'pending' : 'squad_approved';

    const { data, error } = await supabase
        .from('BonusApplications')
        .insert({
            user_id: userId,
            user_name: userName,
            squad_name: squadName,
            battalion_name: battalionName,
            interview_target: target,
            interview_date: date,
            description,
            quest_id: questId,
            screenshot_url: screenshotUrl,
            status,
        })
        .select()
        .single();

    if (error) return { success: false, error: '提交失敗：' + error.message };
    return { success: true, application: data as BonusApplication };
}

// ── 查詢申請列表 ──────────────────────────────────────────
export async function getBonusApplications(filter: {
    userId?: string;
    squadName?: string;
    status?: string;
} = {}) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    let query = supabase.from('BonusApplications').select('*').order('created_at', { ascending: false });

    if (filter.userId) query = query.eq('user_id', filter.userId);
    if (filter.squadName) query = query.eq('squad_name', filter.squadName);
    if (filter.status) query = query.eq('status', filter.status);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message, applications: [] };
    return { success: true, applications: (data || []) as BonusApplication[] };
}

// ── 查詢管理操作日誌 ──────────────────────────────────────
export async function getAdminActivityLog(limit = 50) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
        .from('AdminActivityLog')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) return { success: false, error: error.message, logs: [] };
    return { success: true, logs: data || [] };
}
