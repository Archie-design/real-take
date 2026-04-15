'use server';

import { createClient } from '@supabase/supabase-js';
import { BonusApplication } from '@/types';
import { processCheckInTransaction } from '@/app/actions/quest';
import { logAdminAction } from '@/app/actions/admin';
import { END_DATE } from '@/lib/constants';
import { getLogicalDateStr } from '@/lib/utils/time';

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
    description: string = '',
    bonusType: 'b1' | 'b2' = 'b1'
) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    // questId uses b1/b2 prefix so reward lookup matches BONUS_QUEST_CONFIG
    const questId = `${bonusType}|${interviewDate}|${interviewTarget.trim().slice(0, 50)}`;

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

// ── b1–b7 獎勵對照表 ─────────────────────────────────────
const BONUS_QUEST_CONFIG: Record<string, { reward: number; title: string }> = {
    b1: { reward: 1000, title: '傳愛（訂金）' },
    b2: { reward: 3000, title: '傳愛（完款）' },
    b3: { reward: 5000, title: '續報高階/五運班加分' },
    b4: { reward: 5000, title: '成為心之使者加分' },
    b5: { reward: 3000, title: '報名聯誼會（1年）加分' },
    b6: { reward: 5000, title: '報名聯誼會（2年）加分' },
    b7: { reward: 1000, title: '參加實體課程加分' },
    b8: { reward: 5000, title: '全程參與會長交接加分' },
    b9: { reward: 5000, title: '完成解圓夢計畫或復盤加分' },
    b10: { reward: 5000, title: '完成適應力挑戰計畫加分' },
    b11: { reward: 5000, title: '心之使者內訓加分' },
    b12: { reward: 3000, title: '對父母/伴侶完成三道菜加分' },
    doc1: { reward: 10000, title: '道在江湖紀錄片' },
    doc1_member: { reward: 10000, title: '道在江湖紀錄片參與加分' },
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

    // b5/b6 聯誼會 / doc1_member 紀錄片參與 / b12 三道菜：小隊長初審即最終核准，直接入帳
    const questBase = app.quest_id.split('|')[0];
    const isNetworkingEvent = ['b5', 'b6', 'doc1_member', 'b12'].includes(questBase);

    if (isNetworkingEvent) {
        if (getLogicalDateStr() > END_DATE) {
            return { success: false, error: '活動已於 7/15 截止，無法核發分數。' };
        }

        const bonusInfo = BONUS_QUEST_CONFIG[questBase];

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
            await logAdminAction('direct_squad_approve', reviewer.Name, appId, app.user_name, {
                questId: app.quest_id,
                checkInError: checkInRes.error,
            }, 'error');
            return { success: true, warning: '審核已核准，但入帳失敗：' + checkInRes.error };
        }

        await logAdminAction('direct_squad_approve', reviewer.Name, appId, app.user_name, {
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
        if (getLogicalDateStr() > END_DATE) {
            return { success: false, error: '活動已於 7/15 截止，無法核發分數。' };
        }

        const questIdBase = app.quest_id.split('|')[0];
        const bonusInfo = BONUS_QUEST_CONFIG[questIdBase];
        let reward = bonusInfo ? bonusInfo.reward : 1000;
        let rewardTitle = bonusInfo ? bonusInfo.title : '星光電影推廣獎勵';

        // b2 完款：若同一介紹人對同一對象已有核准的 b1 訂金，自動抵扣差額
        if (questIdBase === 'b2') {
            const { data: priorB1 } = await supabase
                .from('BonusApplications')
                .select('id')
                .eq('user_id', app.user_id)
                .eq('interview_target', app.interview_target)
                .eq('status', 'approved')
                .like('quest_id', 'b1|%')
                .maybeSingle();
            if (priorB1) {
                reward -= BONUS_QUEST_CONFIG['b1'].reward; // 3000 - 1000 = 2000
                rewardTitle += '（已抵扣訂金加分 1000）';
            }
        }

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

// ── 學員：提交 b3–b10 / doc1 加分申請 ──────────────────────────────
export async function submitBonusApplication(
    userId: string,
    userName: string,
    squadName: string | null,
    battalionName: string | null,
    bonusType: 'b3' | 'b4' | 'b5' | 'b6' | 'b7' | 'b8' | 'b9' | 'b10' | 'b11' | 'b12' | 'doc1',
    target: string,      // 申請描述（課程名稱 / 聯誼會 / 課程日期… / 紀錄片連結）
    date: string,        // YYYY-MM-DD
    description: string = '',
    screenshotUrl?: string  // b5/b6 的截圖 URL
) {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // doc1：同一大隊只能提交一次（由大隊長代表提交）
    if (bonusType === 'doc1') {
        const { data: existing } = await supabase
            .from('BonusApplications')
            .select('id, status')
            .eq('quest_id', 'doc1')
            .eq('battalion_name', battalionName)
            .neq('status', 'rejected')
            .maybeSingle();

        if (existing) {
            return { success: false, error: '本大隊已有紀錄片申請記錄，無法重複提交' };
        }
    }

    // b3：每個選項可各申請一次（quest_id = `b3|選項`）
    if (bonusType === 'b3') {
        const b3QuestId = `b3|${target.trim().slice(0, 50)}`;
        const { data: existing } = await supabase
            .from('BonusApplications')
            .select('id, status')
            .eq('user_id', userId)
            .eq('quest_id', b3QuestId)
            .neq('status', 'rejected')
            .maybeSingle();

        if (existing) {
            return { success: false, error: `「${target}」已有申請記錄，無法重複提交` };
        }
    }

    // b4、b5、b6、b8、b9、b10、b11 每人只能申請一次（未被駁回的情況下）
    if (['b4', 'b5', 'b6', 'b8', 'b9', 'b10', 'b11'].includes(bonusType)) {
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

    // b12：對父母/伴侶完成三道菜，同一對象只算1次、全季最多3次
    if (bonusType === 'b12') {
        const b12QuestId = `b12|${target.trim().slice(0, 50)}`;
        const { data: sameTarget } = await supabase
            .from('BonusApplications')
            .select('id')
            .eq('user_id', userId)
            .eq('quest_id', b12QuestId)
            .neq('status', 'rejected')
            .maybeSingle();
        if (sameTarget) {
            return { success: false, error: `「${target}」已有申請記錄，同一對象只計算一次` };
        }
        const { data: allB12 } = await supabase
            .from('BonusApplications')
            .select('id')
            .eq('user_id', userId)
            .like('quest_id', 'b12|%')
            .neq('status', 'rejected');
        if ((allB12?.length ?? 0) >= 3) {
            return { success: false, error: '三道菜已達 3 次上限' };
        }
    }

    // b7：同一課程/活動名稱只算1次（連續幾天的活動不重複計分）
    // quest_id 使用標準化課程名稱作為唯一鍵，日期僅留在 interview_date 供審核參考
    if (bonusType === 'b7') {
        const normalizedName = target.trim().toLowerCase().replace(/\s+/g, '_').slice(0, 60);
        const b7QuestId = `b7|${normalizedName}`;
        const { data: existing } = await supabase
            .from('BonusApplications')
            .select('id, status')
            .eq('user_id', userId)
            .eq('quest_id', b7QuestId)
            .neq('status', 'rejected')
            .maybeSingle();
        if (existing) {
            return { success: false, error: `「${target}」已有申請記錄，同一課程/活動只計算一次` };
        }
    }
    const questId = bonusType === 'b3'
        ? `b3|${target.trim().slice(0, 50)}`
        : bonusType === 'b7'
        ? `b7|${target.trim().toLowerCase().replace(/\s+/g, '_').slice(0, 60)}`
        : bonusType === 'b12'
        ? `b12|${target.trim().slice(0, 50)}`
        : bonusType;

    // b5/b6/b12 送小隊長初審（初審即入帳）；doc1 上傳即核准，無需審核；其他送大隊長終審
    const status = (bonusType === 'b5' || bonusType === 'b6' || bonusType === 'b12') ? 'pending'
        : bonusType === 'doc1' ? 'approved'
        : 'squad_approved';

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

// ── 學員：申請紀錄片參與加分（doc1_member）────────────────────────────────
export async function submitDocumentaryParticipation(
    userId: string,
    userName: string,
    squadName: string | null,
    battalionName: string | null,
) {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: existing } = await supabase
        .from('BonusApplications')
        .select('id, status')
        .eq('user_id', userId)
        .eq('quest_id', 'doc1_member')
        .neq('status', 'rejected')
        .maybeSingle();

    if (existing) {
        return { success: false, error: '已有紀錄片參與申請記錄，無法重複提交' };
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
        .from('BonusApplications')
        .insert({
            user_id: userId,
            user_name: userName,
            squad_name: squadName,
            battalion_name: battalionName,
            interview_target: '紀錄片參與申請',
            interview_date: today,
            quest_id: 'doc1_member',
            status: 'pending',
        })
        .select()
        .single();

    if (error) return { success: false, error: '提交失敗：' + error.message };
    return { success: true, application: data as BonusApplication };
}

// ── 大隊長：更新紀錄片連結 ───────────────────────────────────────────────
export async function updateDocumentaryLink(appId: string, newUrl: string) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase
        .from('BonusApplications')
        .update({ interview_target: newUrl.trim() })
        .eq('id', appId)
        .eq('quest_id', 'doc1');

    if (error) return { success: false, error: '更新失敗：' + error.message };
    return { success: true };
}

// ── 查詢大隊的紀錄片提交記錄 ─────────────────────────────────────────────
export async function getDocumentaryByBattalion(battalionName: string) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
        .from('BonusApplications')
        .select('*')
        .eq('quest_id', 'doc1')
        .eq('battalion_name', battalionName)
        .neq('status', 'rejected')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) return { success: false, error: error.message, documentary: null };
    return { success: true, documentary: (data as BonusApplication) || null };
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
