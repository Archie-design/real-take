'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
    Phone, Mic, Award, Users, PhoneCall,
    GraduationCap, Sparkles, Handshake, BookOpen, Megaphone, Ticket, Upload,
    Film, Clapperboard, AlertTriangle, QrCode, RefreshCw, CheckCircle2, Loader2,
    Crown, Target, Compass, Zap, Utensils,
    type LucideIcon,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { Quest, DailyLog, SystemSettings, TemporaryQuest, BonusApplication, FineSettings, AngelCallPairingsData } from '@/types';
import { WEEKLY_QUEST_CONFIG, SQUAD_THEME_CONFIG, QUEST_ICON_MAP, SQUAD_THEME_ICON_MAP } from '@/lib/constants';
import { getLogicalDateStr, getCurrentThemePeriod } from '@/lib/utils/time';
import { getGatheringStatus, awardGatheringFullBonus, GatheringCheckin } from '@/app/actions/squad-gathering';

interface WeeklyTopicTabProps {
    userId: string;
    systemSettings: SystemSettings;
    fineSettings?: FineSettings;
    logicalTodayStr: string;
    logs: DailyLog[];
    currentWeeklyMonday: Date;
    isTopicDone: boolean;
    temporaryQuests: TemporaryQuest[];
    bonusApplications: BonusApplication[];
    onCheckIn: (q: Quest) => void;
    onUndo: (q: Quest) => void;
    onSubmitInterview: (data: { interviewTarget: string; interviewDate: string; description: string; bonusType?: 'b1' | 'b2' }) => Promise<void>;
    onSubmitBonusApp: (type: 'b3' | 'b4' | 'b5' | 'b6' | 'b7' | 'b8' | 'b9' | 'b10' | 'b11' | 'b12', target: string, date: string, desc: string, screenshotUrl?: string) => Promise<void>;
    questRewardOverrides?: Record<string, number>;
    disabledQuests?: string[];
    // 小隊定聚 QR 掃碼全員到齊
    isCaptain?: boolean;
    teamName?: string;
    squadMemberCount?: number; // 用於判斷是否全員到齊
    // 道在江湖紀錄片參與加分
    battalionDocumentary?: BonusApplication | null;
    onSubmitDocParticipation?: () => Promise<void>;
    // 天使通話配對
    angelCallPairings?: AngelCallPairingsData;
}

const BONUS_CONFIG: Array<{
    id: 'b3' | 'b4' | 'b5' | 'b6' | 'b7' | 'b8' | 'b9' | 'b10' | 'b11' | 'b12';
    icon: string;
    title: string;
    sub: string;
    reward: number;
    repeatable: boolean;
}> = [
    { id: 'b3', icon: '🎓', title: '續報高階/五運班', sub: '5/3之後報名才算，僅限新生報名，報名複訓不予計分', reward: 5000, repeatable: true },
    { id: 'b4', icon: '💫', title: '成為心之使者', sub: '2026 年度已是心之使者的皆可計算', reward: 5000, repeatable: false },
    { id: 'b5', icon: '🤝', title: '報名聯誼會（1年）', sub: '2026/1/16 後完款', reward: 3000, repeatable: false },
    { id: 'b6', icon: '🤝', title: '報名聯誼會（2年）', sub: '2026/1/16 後完款', reward: 5000, repeatable: false },
    { id: 'b7', icon: '📚', title: '參加實體課程', sub: '官網公告或全體系課程，連續幾天只算 1 次', reward: 1000, repeatable: true },
    { id: 'b8', icon: '👑', title: '全程參與會長交接', sub: '6/28 會長交接全程參與', reward: 5000, repeatable: false },
    { id: 'b9', icon: '🎯', title: '完成解圓夢計畫 or 復盤', sub: '與輔導員完成解圓夢計畫或復盤', reward: 5000, repeatable: false },
    { id: 'b10', icon: '🧭', title: '完成適應力挑戰計畫', sub: '完成 21 天適應力突破計劃', reward: 5000, repeatable: false },
    { id: 'b11', icon: '⚡', title: '心之使者內訓', sub: '參加心之使者內訓課程', reward: 5000, repeatable: false },
    { id: 'b12', icon: '🍽️', title: '對父母/伴侶完成三道菜', sub: '為父母、伴侶或上級親手完成三道菜，每個對象限 1 次、全季最多 3 次', reward: 3000, repeatable: true },
];

const BONUS_ICON_MAP: Record<string, LucideIcon> = {
    b3: GraduationCap,
    b4: Sparkles,
    b5: Handshake,
    b6: Handshake,
    b7: BookOpen,
    b8: Crown,
    b9: Target,
    b10: Compass,
    b11: Zap,
    b12: Utensils,
};

const B3_OPTIONS = [
    '續報三階',
    '續報四階',
    '續報五階',
    '報名五運班'
];

const B7_OPTIONS = [
    '5/7 大方圓一階同學會',
    '5/11 一階課後課',
    '5/18 一階課後課',
    '5/25 一階課後課',
    '6/5 一階課後課',
    '5/16-5/17 心之使者內訓',
    '5/20-5/21 圓夢計畫初階',
    '6/1 二階家長會議',
    '6/6-6/9 二階大堂課',
    '6/11-6/14 二階大堂課',
    '6/16-6/19 二階大堂課',
    '❤️ 6/22 親證班課後課',
    '6/24 大方圓二階同學會',
    '6/28 會長交接',
    '6/29 三階家長會議',
    '6/30 二階課後課',
    '7/1 菁英領袖會議',
    '7/4-7/7 三階大堂課',
    '7/9-7/12 三階大堂課',
    '7/14-7/17 三階大堂課',
];

const BONUS_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending:       { label: '🟡 待劇組長初審', color: 'text-yellow-400' },
    squad_approved:{ label: '🔵 待發行商長終審', color: 'text-blue-400' },
    approved:      { label: '🟢 已核准（票房入帳）', color: 'text-emerald-400' },
    rejected:      { label: '🔴 已退回', color: 'text-red-400' },
};

// ── 週曆打卡列 ───────────────────────────────────────────────────────────
function WeekCalendarRow({
    questId,
    logs,
    limit,
    disabled,
    currentWeeklyMonday,
    onCheckIn,
    onUndo,
}: {
    questId: string;
    logs: DailyLog[];
    limit: number;
    disabled: boolean;
    currentWeeklyMonday: Date;
    onCheckIn: (qId: string, day: Date) => void;
    onUndo: (qId: string, day: Date) => void;
}) {
    return (
        <div className="flex justify-between items-center px-1">
            {['一', '二', '三', '四', '五', '六', '日'].map((dayLabel, idx) => {
                const d = new Date();
                const currentDay = d.getDay() || 7;
                d.setDate(d.getDate() + (idx + 1 - currentDay));
                const qId = `${questId}|${getLogicalDateStr(d)}`;
                const isDone = logs.some(l => l.QuestID === qId);
                const isDisabled = disabled && !isDone;
                return (
                    <div key={idx} className="flex flex-col items-center gap-1.5">
                        <span className="text-[10px] text-gray-500 font-mono">{d.getMonth() + 1}/{d.getDate()}</span>
                        <button
                            disabled={isDisabled}
                            onClick={() => isDone ? onUndo(questId, d) : onCheckIn(questId, d)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all
                                ${isDone
                                    ? 'bg-[#C0392B] text-white shadow-lg'
                                    : isDisabled
                                        ? 'bg-[#16213E] text-gray-600 cursor-not-allowed'
                                        : 'bg-[#16213E] text-gray-500 hover:bg-[#253A5C] active:scale-90'}`}
                        >
                            {dayLabel}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

// ── 月曆橫列（w3 小隊定聚專用，顯示整個月份）────────────────────────────────

function MonthCalendarRow({
    questId,
    logs,
    disabled,
    logicalTodayStr,
    onCheckIn,
    onUndo,
}: {
    questId: string;
    logs: DailyLog[];
    disabled: boolean;
    logicalTodayStr: string;
    onCheckIn: (qId: string, day: Date) => void;
    onUndo: (qId: string, day: Date) => void;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const todayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (todayRef.current && scrollRef.current) {
            const container = scrollRef.current;
            const el = todayRef.current;
            container.scrollLeft = el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2;
        }
    }, []);

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];

    return (
        <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
            {Array.from({ length: daysInMonth }, (_, i) => {
                // 使用正午建立日期，確保 getLogicalDateStr 回傳當天日曆日，
                // 避免午夜時刻被判為前一天導致 QuestID 與原始 log 不一致
                const d = new Date(year, month, i + 1, 12, 0, 0);
                const logicalDate = getLogicalDateStr(d);
                const qId = `${questId}|${logicalDate}`;
                const isDone = logs.some(l => l.QuestID === qId);
                const isToday = logicalDate === logicalTodayStr;
                const isFuture = logicalDate > logicalTodayStr;
                const isDisabled = (disabled && !isDone) || isFuture;
                return (
                    <div
                        key={i}
                        ref={isToday ? todayRef : undefined}
                        className="flex flex-col items-center gap-1 shrink-0"
                    >
                        <span className="text-[9px] text-gray-600 font-mono">{dayLabels[d.getDay()]}</span>
                        <button
                            disabled={isDisabled}
                            onClick={() => isDone ? onUndo(questId, d) : onCheckIn(questId, d)}
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all
                                ${isDone
                                    ? 'bg-[#C0392B] text-white shadow-lg'
                                    : isToday
                                        ? 'bg-[#253A5C] text-white ring-1 ring-white/30'
                                        : isDisabled
                                            ? 'bg-[#16213E] text-gray-700 cursor-not-allowed'
                                            : 'bg-[#16213E] text-gray-500 hover:bg-[#253A5C] active:scale-90'}`}
                        >
                            {d.getDate()}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

export function WeeklyTopicTab({
    userId,
    systemSettings,
    fineSettings,
    logicalTodayStr,
    logs,
    currentWeeklyMonday,
    isTopicDone,
    temporaryQuests,
    bonusApplications,
    onCheckIn,
    onUndo,
    onSubmitInterview,
    onSubmitBonusApp,
    questRewardOverrides,
    disabledQuests,
    isCaptain = false,
    teamName = '',
    squadMemberCount = 0,
    battalionDocumentary = null,
    onSubmitDocParticipation,
    angelCallPairings,
}: WeeklyTopicTabProps) {
    // ── 當前電影主題週期 ──
    const themePeriod = getCurrentThemePeriod();

    // ── 動態分值覆寫與停用過濾 ──
    const disabledSet = new Set(disabledQuests || []);
    const weeklyQuests = WEEKLY_QUEST_CONFIG
        .filter(q => !disabledSet.has(q.id))
        .map(q => questRewardOverrides?.[q.id] != null ? { ...q, reward: questRewardOverrides[q.id] } : q);

    // ── 傳愛申請 state ──
    const [showW4Form, setShowW4Form] = useState(false);
    const [w4Target, setW4Target] = useState('');
    const [w4Date, setW4Date] = useState(getLogicalDateStr(new Date()));
    const [w4BonusType, setW4BonusType] = useState<'b1' | 'b2'>('b1');
    const [w4Desc, setW4Desc] = useState('');
    const [isSubmittingW4, setIsSubmittingW4] = useState(false);

    // ── b3-b10 加分申請 state ──
    const [activeBonusForm, setActiveBonusForm] = useState<'b3' | 'b4' | 'b5' | 'b6' | 'b7' | 'b8' | 'b9' | 'b10' | 'b11' | 'b12' | null>(null);
    const [bonusTarget, setBonusTarget] = useState('');
    const [bonusDate, setBonusDate] = useState(getLogicalDateStr(new Date()));
    const [bonusDesc, setBonusDesc] = useState('');
    const [isSubmittingBonus, setIsSubmittingBonus] = useState(false);
    const [bonusScreenshot, setBonusScreenshot] = useState<File | null>(null);
    const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
    const [screenshotUrl, setScreenshotUrl] = useState<string>('');

    // ── 小隊主題定聚選擇 state ──
    const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

    // ── 定聚 QR Code 掃碼全員到齊 state ──
    const [gatheringQrTheme, setGatheringQrTheme] = useState<string | null>(null); // 目前開放掃碼的主題
    const [gatheringCheckins, setGatheringCheckins] = useState<GatheringCheckin[]>([]);
    const [isLoadingCheckins, setIsLoadingCheckins] = useState(false);
    const [isAwardingBonus, setIsAwardingBonus] = useState(false);
    const [awardResult, setAwardResult] = useState<{ awarded: number; errors: string[] } | null>(null);

    const buildGatheringId = useCallback((themeId: string) => {
        return `${themeId}|${teamName}|${logicalTodayStr}`;
    }, [teamName, logicalTodayStr]);

    const refreshCheckins = useCallback(async (themeId: string) => {
        setIsLoadingCheckins(true);
        const gid = buildGatheringId(themeId);
        const res = await getGatheringStatus(gid, squadMemberCount);
        if (res.success && res.status) {
            setGatheringCheckins(res.status.checkins);
        }
        setIsLoadingCheckins(false);
    }, [buildGatheringId, squadMemberCount]);

    const handleStartGathering = (themeId: string) => {
        setGatheringQrTheme(themeId);
        setAwardResult(null);
        refreshCheckins(themeId);
    };

    const handleAwardFullBonus = async (themeId: string) => {
        setIsAwardingBonus(true);
        const gid = buildGatheringId(themeId);
        const res = await awardGatheringFullBonus(gid, themeId as 'sq1' | 'sq2' | 'sq3' | 'sq4');
        setAwardResult({ awarded: res.awarded, errors: res.errors });
        setIsAwardingBonus(false);
    };

    const handleW4Submit = async (e: { preventDefault: () => void }) => {
        e.preventDefault();
        if (!w4Target.trim()) return;
        setIsSubmittingW4(true);
        await onSubmitInterview({
            interviewTarget: w4Target,
            interviewDate: w4Date,
            description: `[${w4BonusType === 'b2' ? '完款' : '訂金'}] ${w4Desc}`.trim(),
            bonusType: w4BonusType,
        });
        setIsSubmittingW4(false);
        setShowW4Form(false);
        setW4Target('');
        setW4Desc('');
    };

    const handleBonusSubmit = async (e: { preventDefault: () => void }) => {
        e.preventDefault();
        if (!activeBonusForm || !bonusTarget.trim()) return;

        let uploadedUrl = '';

        // b5/b6 需要上傳截圖
        if ((activeBonusForm === 'b5' || activeBonusForm === 'b6') && bonusScreenshot) {
            setIsUploadingScreenshot(true);
            try {
                const formData = new FormData();
                formData.append('file', bonusScreenshot);
                formData.append('userId', userId);

                const response = await fetch('/api/upload/bonus-screenshot', {
                    method: 'POST',
                    body: formData,
                });

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || '上傳失敗');
                }

                uploadedUrl = result.url;
                setScreenshotUrl(uploadedUrl);
            } catch (err: any) {
                setIsUploadingScreenshot(false);
                alert('截圖上傳失敗：' + (err.message || '未知錯誤'));
                return;
            }
            setIsUploadingScreenshot(false);
        }

        setIsSubmittingBonus(true);
        try {
            await onSubmitBonusApp(activeBonusForm, bonusTarget.trim(), bonusDate, bonusDesc.trim(), uploadedUrl || screenshotUrl);
            setActiveBonusForm(null);
            setBonusTarget('');
            setBonusDesc('');
            setBonusScreenshot(null);
            setScreenshotUrl('');
        } catch (err) {
            alert('提交失敗：' + (err instanceof Error ? err.message : '未知錯誤'));
        } finally {
            setIsSubmittingBonus(false);
        }
    };

    const makeWeekHandler = (questId: string, quest: Quest) => ({
        onCheckIn: (_qid: string, day: Date) => {
            const qId = `${questId}|${getLogicalDateStr(day)}`;
            onCheckIn({ ...quest, id: qId });
        },
        onUndo: (_qid: string, day: Date) => {
            const qId = `${questId}|${getLogicalDateStr(day)}`;
            onUndo({ ...quest, id: qId });
        },
    });

    // ── 罰款邏輯判斷 ──
    const isFineActive = () => {
        if (!fineSettings?.enabled) return false;
        if (!fineSettings.periodStart || !fineSettings.periodEnd) return true;
        return logicalTodayStr >= fineSettings.periodStart && logicalTodayStr <= fineSettings.periodEnd;
    };
    const showFine = isFineActive();
    const isFineItem = (id: string) => showFine && fineSettings?.items?.includes(id);

    // ── 各任務本週完成次數 ──
    const countThisWeek = (qId: string) =>
        logs.filter(l => l.QuestID.startsWith(qId + '|') && new Date(l.Timestamp) >= currentWeeklyMonday).length;

    const a1Quest = weeklyQuests.find(q => q.id === 'a1');
    const w1Quest = weeklyQuests.find(q => q.id === 'w1');
    const w2Quest = weeklyQuests.find(q => q.id === 'w2');
    const w3Quest = weeklyQuests.find(q => q.id === 'w3');
    const w4Quest = weeklyQuests.find(q => q.id === 'w4');

    const a1Count = countThisWeek('a1');
    const w1Count = countThisWeek('w1');
    const w2Count = countThisWeek('w2');
    // w3/w4 月限：用本月
    const thisMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
    // 只計 w3|YYYY-MM-DD（2 段）；排除 w3|date|target 等多段格式
    const w3CountMonth = logs.filter(l => l.QuestID.startsWith(`w3|${thisMonthStr}`) && l.QuestID.split('|').length === 2).length;
    // 只計 w4|YYYY-MM-DD（2 段）；排除 w4|date|對象名稱（傳愛格式）
    const w4CountMonth = logs.filter(l => l.QuestID.startsWith(`w4|${thisMonthStr}`) && l.QuestID.split('|').length === 2).length;

    // ── t3 沉澱週分享計數（依 t3QuestBase 為前綴）──
    const t3Base = themePeriod.t3QuestBase;
    const t3Count = t3Base
        ? logs.filter(l => l.QuestID.startsWith(t3Base + '|')).length
        : 0;

    // ── b3-b10 申請記錄（從 bonusApplications 篩選）──
    const bonusApps = bonusApplications.filter((a: BonusApplication) =>
        ['b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10', 'b11', 'b12'].some(id => a.quest_id === id || a.quest_id.startsWith(id + '|'))
    );

    // ── 紀錄片參與申請記錄 ──
    const docMemberApp = bonusApplications.find((a: BonusApplication) => a.quest_id === 'doc1_member');

    // ── 紀錄片參與提交 state ──
    const [isSubmittingDocPart, setIsSubmittingDocPart] = useState(false);

    return (
        <div className="space-y-8 pb-10 animate-in slide-in-from-right-8 duration-500">


            {/* ── 電影主題週次狀態 ── */}
            <section className="space-y-3">
                <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">當前電影主題</h2>
                <div className={`p-4 rounded-3xl border flex items-center gap-4 ${
                    themePeriod.type === 'regular' ? 'bg-[#1B2A4A] border-[#F5C842]/30'
                    : themePeriod.type === 'reflection' ? 'bg-[#F5C842]/5 border-[#F5C842]/40'
                    : 'bg-[#1B2A4A] border-[#253A5C]'
                }`}>
                    <div className="w-12 h-12 rounded-2xl bg-black/50 flex items-center justify-center text-white/60 shrink-0"><Film size={28} /></div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-black text-white text-sm">《{themePeriod.movie}》</p>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                themePeriod.type === 'reflection' ? 'bg-[#F5C842] text-black' : 'bg-[#C0392B] text-white'
                            }`}>{themePeriod.weeks}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{themePeriod.desc}</p>
                    </div>
                </div>
            </section>

            {/* ── 沉澱週 t3 分享任務（功夫熊貓 / 腦筋急轉彎）── */}
            {themePeriod.taskType === 't3' && t3Base && (
                <section className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <h2 className="text-[10px] font-black text-[#F5C842] uppercase tracking-widest">沉澱週分享任務</h2>
                        <span className={`text-[10px] font-bold ${t3Count >= 3 ? 'text-[#C0392B]' : 'text-gray-600'}`}>{t3Count} / 3 則</span>
                    </div>
                    <div className={`p-5 rounded-3xl border space-y-4 relative overflow-hidden ${
                        t3Count >= 3 ? 'opacity-60 bg-[#F5C842]/10 border-[#F5C842]/30' : (isFineItem('t3') ? 'bg-red-950/10 border-red-500/20' : 'bg-[#F5C842]/10 border-[#F5C842]/30')
                    }`}>
                        {isFineItem('t3') && t3Count < 1 && (
                            <div className="absolute top-0 right-0 px-3 py-1 bg-red-600/20 border-l border-b border-red-500/30 rounded-bl-xl flex items-center gap-1">
                                <AlertTriangle size={10} className="text-red-500" />
                                <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">本週必修罰款</span>
                            </div>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-white/60 shrink-0"><Film size={22} /></div>
                            <div className="flex-1">
                                <p className="font-bold text-white text-sm">沉澱週分享</p>
                                <p className="text-[10px] text-gray-400">{themePeriod.desc}</p>
                                <p className="text-[10px] text-[#F5C842] mt-0.5">+{themePeriod.t3Reward} / 則，最多 3 則</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            {['一', '二', '三', '四', '五', '六', '日'].map((day, idx) => {
                                const d = new Date();
                                const cd = d.getDay() || 7;
                                d.setDate(d.getDate() + (idx + 1 - cd));
                                const qId = `${t3Base}|${getLogicalDateStr(d)}`;
                                const isDone = logs.some(l => l.QuestID === qId);
                                const isCapped = !isDone && t3Count >= 3;
                                return (
                                    <div key={idx} className="flex flex-col items-center gap-1.5">
                                        <span className="text-[10px] text-gray-500 font-mono">{d.getMonth() + 1}/{d.getDate()}</span>
                                        <button
                                            disabled={isCapped}
                                            onClick={() => isDone
                                                ? onUndo({ id: qId, title: '沉澱週分享', reward: themePeriod.t3Reward })
                                                : onCheckIn({ id: qId, title: '沉澱週分享', reward: themePeriod.t3Reward })}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all
                                                ${isDone ? 'bg-[#F5C842] text-black' : isCapped ? 'bg-[#16213E] text-gray-600 cursor-not-allowed' : 'bg-[#16213E] text-gray-500 hover:bg-[#253A5C] active:scale-90'}`}
                                        >{day}</button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* ── 個人主題影展（t1）── */}
            <section className="space-y-3">
                <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">個人主題任務</h2>
                <div className={`p-5 rounded-3xl border-2 ${isTopicDone ? 'border-[#F5C842]/60 bg-[#F5C842]/5' : 'border-[#F5C842]/30 bg-[#1B2A4A]'} shadow-xl`}>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-black/50 flex items-center justify-center text-white/60 shrink-0"><Clapperboard size={28} /></div>
                        <div className="flex-1">
                            <span className="text-[9px] font-black bg-[#F5C842] text-black px-2 py-0.5 rounded-full uppercase">主題影展</span>
                            <h3 className="text-lg font-black text-white mt-1 italic">「{themePeriod.movie}」</h3>
                        </div>
                        <div className="text-right">
                            <p className="font-black text-[#F5C842]">+1,000</p>
                            <p className="text-[10px] text-gray-500">計劃完成</p>
                        </div>
                    </div>
                    <button
                        onClick={() => isTopicDone
                            ? onUndo({ id: 't1', title: '主題影展', reward: 1000 })
                            : onCheckIn({ id: 't1', title: '主題影展', reward: 1000 })}
                        className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95
                            ${isTopicDone
                                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
                                : 'bg-[#F5C842] text-black shadow-lg shadow-[0_0_15px_rgba(212,175,55,0.3)]'}`}
                    >
                        {isTopicDone ? '✓ 已完成計劃（點擊取消）' : <span className="flex items-center justify-center gap-1.5"><Ticket size={14} />完成計劃 / 解盤</span>}
                    </button>
                </div>
            </section>

            {/* ── 每日親證打卡（t2 — 需先完成 t1）── */}
            {isTopicDone && (() => {
                const t2Config = { id: 't2', title: '每日親證打卡', reward: 500, limit: 99 };
                const { onCheckIn: t2CheckIn, onUndo: t2Undo } = makeWeekHandler('t2', { id: 't2', title: '每日親證打卡', reward: 500, limit: 99 });
                return (
                    <section className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">每日親證打卡</h2>
                            <span className="text-[10px] text-gray-600">+{t2Config.reward} / 日</span>
                        </div>
                        <div className="p-5 rounded-3xl bg-[#1B2A4A] border border-[#253A5C]">
                            <WeekCalendarRow
                                questId="t2"
                                logs={logs}
                                limit={99}
                                disabled={false}
                                currentWeeklyMonday={currentWeeklyMonday}
                                onCheckIn={t2CheckIn}
                                onUndo={t2Undo}
                            />
                        </div>
                    </section>
                );
            })()}

            {/* ── a1：天使通話（每週 1–3 次）── */}
            <section className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">天使通話</h2>
                    <span className={`text-[10px] font-bold ${a1Count >= 3 ? 'text-[#C0392B]' : 'text-gray-600'}`}>{a1Count} / 3 次</span>
                </div>
                <div className={`p-5 rounded-3xl border space-y-4 relative overflow-hidden ${
                    a1Count >= 3 ? 'opacity-60 bg-[#1B2A4A] border-[#253A5C]' : (isFineItem('a1') ? 'bg-red-950/10 border-red-500/20' : 'bg-[#1B2A4A] border-[#253A5C]')
                }`}>
                    {isFineItem('a1') && a1Count < 1 && (
                        <div className="absolute top-0 right-0 px-3 py-1 bg-red-600/20 border-l border-b border-red-500/30 rounded-bl-xl flex items-center gap-1">
                            <AlertTriangle size={10} className="text-red-500" />
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">本週必修罰款</span>
                        </div>
                    )}
                    {a1Quest && (<>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-white/70 shrink-0"><Phone size={22} /></div>
                        <div className="flex-1">
                            <p className="font-bold text-white text-sm">天使通話</p>
                            <p className="text-[10px] text-gray-500">每週至少 1 次，無次數上限 · +{a1Quest.reward}/次</p>
                            {(() => {
                                const myGroup = angelCallPairings?.pairings?.find(p => p.group.some(m => m.id === userId));
                                const partners = myGroup?.group.filter(m => m.id !== userId) || [];
                                return partners.length > 0
                                    ? <p className="text-[10px] text-indigo-400 font-bold mt-0.5">本週通話對象：{partners.map(m => m.name).join('、')}</p>
                                    : <p className="text-[10px] text-gray-600 mt-0.5">本週尚未配對，請劇組長執行配對</p>;
                            })()}
                        </div>
                    </div>
                    <WeekCalendarRow
                        questId="a1"
                        logs={logs}
                        limit={3}
                        disabled={a1Count >= 3}
                        currentWeeklyMonday={currentWeeklyMonday}
                        onCheckIn={(_, day) => onCheckIn({ ...a1Quest, id: `a1|${getLogicalDateStr(day)}` })}
                        onUndo={(_, day) => onUndo({ ...a1Quest, id: `a1|${getLogicalDateStr(day)}` })}
                    />
                    </>)}
                </div>
            </section>

            {/* ── w1：親證分享（每週最多 1 則）── */}
            {w1Quest && <section className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">親證分享</h2>
                    <span className={`text-[10px] font-bold ${w1Count >= 1 ? 'text-[#C0392B]' : 'text-gray-600'}`}>{w1Count} / 1 則</span>
                </div>
                <div className={`p-5 rounded-3xl border space-y-4 relative overflow-hidden ${
                    w1Count >= 1 ? 'opacity-60 bg-[#1B2A4A] border-[#253A5C]' : (isFineItem('w1') ? 'bg-red-950/10 border-red-500/20' : 'bg-[#1B2A4A] border-[#253A5C]')
                }`}>
                    {isFineItem('w1') && w1Count < 1 && (
                        <div className="absolute top-0 right-0 px-3 py-1 bg-red-600/20 border-l border-b border-red-500/30 rounded-bl-xl flex items-center gap-1">
                            <AlertTriangle size={10} className="text-red-500" />
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">本週必修罰款</span>
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-white/70 shrink-0"><Mic size={22} /></div>
                        <div className="flex-1">
                            <p className="font-bold text-white text-sm">親證分享</p>
                            <p className="text-[10px] text-gray-500">群組分享上週親證 & 下週行動方案 · +{w1Quest.reward}</p>
                        </div>
                    </div>
                    <WeekCalendarRow
                        questId="w1"
                        logs={logs}
                        limit={1}
                        disabled={w1Count >= 1}
                        currentWeeklyMonday={currentWeeklyMonday}
                        {...makeWeekHandler('w1', w1Quest)}
                    />
                </div>
            </section>}

            {/* ── w2：欣賞／肯定夥伴（每週最多 1 則）── */}
            {w2Quest && <section className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">欣賞／肯定夥伴</h2>
                    <span className={`text-[10px] font-bold ${w2Count >= 3 ? 'text-[#C0392B]' : 'text-gray-600'}`}>{w2Count} / 3 則</span>
                </div>
                <div className={`p-5 rounded-3xl border space-y-4 relative overflow-hidden ${
                    w2Count >= 3 ? 'opacity-60 bg-[#1B2A4A] border-[#253A5C]' : (isFineItem('w2') ? 'bg-red-950/10 border-red-500/20' : 'bg-[#1B2A4A] border-[#253A5C]')
                }`}>
                    {isFineItem('w2') && w2Count < 1 && (
                        <div className="absolute top-0 right-0 px-3 py-1 bg-red-600/20 border-l border-b border-red-500/30 rounded-bl-xl flex items-center gap-1">
                            <AlertTriangle size={10} className="text-red-500" />
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">本週必修罰款</span>
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-white/70 shrink-0"><Award size={22} /></div>
                        <div className="flex-1">
                            <p className="font-bold text-white text-sm">欣賞／肯定夥伴</p>
                                            <p className="text-[10px] text-gray-500">每週最多 1 則 · +{w2Quest.reward}/則</p>
                        </div>
                    </div>
                    <WeekCalendarRow
                        questId="w2"
                        logs={logs}
                        limit={3}
                        disabled={w2Count >= 3}
                        currentWeeklyMonday={currentWeeklyMonday}
                        {...makeWeekHandler('w2', w2Quest)}
                    />
                </div>
            </section>}

            {/* ── w3：小隊定聚（每月最多 2 次）+ 主題任務 ── */}
            {w3Quest && <section className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">小隊定聚</h2>
                    <span className={`text-[10px] font-bold ${w3CountMonth >= 2 ? 'text-[#C0392B]' : 'text-gray-600'}`}>{w3CountMonth} / 2 次（本月）</span>
                </div>
                <div className={`p-5 rounded-3xl border space-y-5 relative overflow-hidden ${
                    w3CountMonth >= 2 ? 'opacity-60 bg-[#1B2A4A] border-[#253A5C]' : (isFineItem('w3') ? 'bg-red-950/10 border-red-500/20' : 'bg-[#1B2A4A] border-[#253A5C]')
                }`}>
                    {isFineItem('w3') && w3CountMonth < 1 && (
                        <div className="absolute top-0 right-0 px-3 py-1 bg-red-600/20 border-l border-b border-red-500/30 rounded-bl-xl flex items-center gap-1">
                            <AlertTriangle size={10} className="text-red-500" />
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">本月必修罰款</span>
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-white/70 shrink-0"><Users size={22} /></div>
                        <div className="flex-1">
                            <p className="font-bold text-white text-sm">小隊定聚</p>
                            <p className="text-[10px] text-gray-500">每月最多 2 次 · 基礎 +{w3Quest.reward.toLocaleString()} · 另加主題獎勵</p>
                        </div>
                    </div>
                    <MonthCalendarRow
                        questId="w3"
                        logs={logs}
                        disabled={w3CountMonth >= 2}
                        logicalTodayStr={logicalTodayStr}
                        {...makeWeekHandler('w3', w3Quest)}
                    />

                    {/* 主題選擇 */}
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">選擇本次主題（另加積分）</p>
                        <div className="grid grid-cols-2 gap-2">
                            {SQUAD_THEME_CONFIG.map(theme => (
                                <button
                                    key={theme.id}
                                    onClick={() => setSelectedTheme(selectedTheme === theme.id ? null : theme.id)}
                                    className={`p-3 rounded-2xl border text-left transition-all
                                        ${selectedTheme === theme.id
                                            ? 'border-[#F5C842] bg-[#F5C842]/10'
                                            : 'border-[#253A5C] bg-black hover:border-[#555]'}`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        {(() => {
                                            const TIcon = SQUAD_THEME_ICON_MAP[theme.id];
                                            return TIcon
                                                ? <TIcon size={16} className={selectedTheme === theme.id ? 'text-[#F5C842]' : 'text-white/60'} />
                                                : <span className="text-xl">{theme.icon}</span>;
                                        })()}
                                        <span className={`font-black text-xs ${selectedTheme === theme.id ? 'text-[#F5C842]' : 'text-white'}`}>{theme.title}</span>
                                    </div>
                                    <p className="text-[9px] text-gray-500">{theme.attr}</p>
                                    <p className="text-[10px] text-[#F5C842] font-bold mt-1">+{theme.reward.toLocaleString()} (+{theme.bonusFull.toLocaleString()} 全員)</p>
                                </button>
                            ))}
                        </div>
                        {selectedTheme && (() => {
                            const theme = SQUAD_THEME_CONFIG.find(t => t.id === selectedTheme)!;
                            return (
                                <div className="p-3 rounded-2xl bg-[#F5C842]/10 border border-[#F5C842]/30 space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs text-[#F5C842] font-bold">
                                        {(() => {
                                            const TIcon = SQUAD_THEME_ICON_MAP[theme.id];
                                            return TIcon ? <TIcon size={13} /> : <span>{theme.icon}</span>;
                                        })()}
                                        {theme.title} 主題說明
                                    </div>
                                    <p className="text-[10px] text-gray-400">{theme.desc}</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onCheckIn({ id: theme.id, title: `${theme.title} 主題定聚`, reward: theme.reward })}
                                            className="flex-1 py-2 bg-[#F5C842] text-black font-black rounded-xl text-xs active:scale-95 transition-all"
                                        >
                                            +{theme.reward.toLocaleString()} 主題積分
                                        </button>
                                        {isCaptain ? (
                                            <button
                                                onClick={() => handleStartGathering(theme.id)}
                                                className="flex-1 py-2 bg-emerald-700/80 text-white font-bold rounded-xl text-xs active:scale-95 transition-all hover:bg-emerald-600 flex items-center justify-center gap-1"
                                            >
                                                <QrCode size={12} />
                                                掃碼全員到齊
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => onCheckIn({ id: `${theme.id}_full`, title: `${theme.title} 全員到齊`, reward: theme.bonusFull })}
                                                className="flex-1 py-2 bg-[#253A5C] text-white font-bold rounded-xl text-xs active:scale-95 transition-all hover:bg-[#444]"
                                            >
                                                +{theme.bonusFull.toLocaleString()} 全員加成
                                            </button>
                                        )}
                                    </div>
                                    {/* QR Code 掃碼面板（小隊長限定） */}
                                    {isCaptain && gatheringQrTheme === theme.id && (() => {
                                        const gid = buildGatheringId(theme.id);
                                        const qrUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/squad-checkin?g=${encodeURIComponent(gid)}`;
                                        const isComplete = gatheringCheckins.length >= squadMemberCount && squadMemberCount > 0;
                                        return (
                                            <div className="mt-2 p-4 rounded-2xl bg-black/40 border border-emerald-600/30 space-y-4">
                                                {/* QR Code */}
                                                <div className="flex flex-col items-center gap-2">
                                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">請隊員掃碼報到</p>
                                                    <div className="bg-white p-3 rounded-xl">
                                                        <QRCode value={qrUrl} size={160} />
                                                    </div>
                                                    <p className="text-[9px] text-gray-500 text-center break-all">{qrUrl}</p>
                                                </div>
                                                {/* 到場名單 */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase">
                                                            已到場 {gatheringCheckins.length} {squadMemberCount > 0 ? `/ ${squadMemberCount}` : ''} 人
                                                        </p>
                                                        <button
                                                            onClick={() => refreshCheckins(theme.id)}
                                                            disabled={isLoadingCheckins}
                                                            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                                                        >
                                                            <RefreshCw size={10} className={isLoadingCheckins ? 'animate-spin' : ''} />
                                                            重新整理
                                                        </button>
                                                    </div>
                                                    {gatheringCheckins.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {gatheringCheckins.map(c => (
                                                                <div key={c.userId} className="flex items-center gap-2 text-xs text-emerald-400">
                                                                    <CheckCircle2 size={12} />
                                                                    <span className="font-bold">{c.userName ?? c.userId}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-[10px] text-gray-600">尚無人報到…</p>
                                                    )}
                                                </div>
                                                {/* 確認全員加成按鈕 */}
                                                {awardResult ? (
                                                    <div className="text-center text-xs text-emerald-400 font-bold">
                                                        已發放 +{theme.bonusFull.toLocaleString()} × {awardResult.awarded} 人
                                                        {awardResult.errors.length > 0 && (
                                                            <p className="text-red-400 mt-1">{awardResult.errors.join('、')}</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <button
                                                        disabled={isAwardingBonus || gatheringCheckins.length === 0}
                                                        onClick={() => handleAwardFullBonus(theme.id)}
                                                        className={`w-full py-2.5 rounded-xl font-black text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5
                                                            ${isComplete
                                                                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                                                                : 'bg-[#253A5C] text-gray-400 hover:bg-[#333]'}`}
                                                    >
                                                        {isAwardingBonus
                                                            ? <><Loader2 size={12} className="animate-spin" /> 發放中…</>
                                                            : isComplete
                                                                ? `全員到齊！發放 +${theme.bonusFull.toLocaleString()} 給所有人`
                                                                : `確認發放 +${theme.bonusFull.toLocaleString()}（${gatheringCheckins.length} 人）`}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </section>}

            {/* ── w4：小隊通話（每月最多 2 次）── */}
            {w4Quest && <section className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">小隊通話</h2>
                    <span className={`text-[10px] font-bold ${w4CountMonth >= 2 ? 'text-[#C0392B]' : 'text-gray-600'}`}>{w4CountMonth} / 2 次（本月）</span>
                </div>
                <div className={`p-5 rounded-3xl border space-y-4 relative overflow-hidden ${
                    w4CountMonth >= 2 ? 'opacity-60 bg-[#1B2A4A] border-[#253A5C]' : (isFineItem('w4') ? 'bg-red-950/10 border-red-500/20' : 'bg-[#1B2A4A] border-[#253A5C]')
                }`}>
                    {isFineItem('w4') && w4CountMonth < 1 && (
                        <div className="absolute top-0 right-0 px-3 py-1 bg-red-600/20 border-l border-b border-red-500/30 rounded-bl-xl flex items-center gap-1">
                            <AlertTriangle size={10} className="text-red-500" />
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">本月必修罰款</span>
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-white/70 shrink-0"><PhoneCall size={22} /></div>
                        <div className="flex-1">
                            <p className="font-bold text-white text-sm">小隊通話</p>
                            <p className="text-[10px] text-gray-500">每月最多 2 次 · +{w4Quest.reward.toLocaleString()}</p>
                        </div>
                    </div>
                    <MonthCalendarRow
                        questId="w4"
                        logs={logs}
                        disabled={w4CountMonth >= 2}
                        logicalTodayStr={logicalTodayStr}
                        {...makeWeekHandler('w4', w4Quest)}
                    />
                </div>
            </section>}

            {/* ── 傳愛系統（b1/b2）── */}
            <section className="space-y-3">
                <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">傳愛加分</h2>
                <div className="p-5 rounded-3xl bg-[#1B2A4A] border border-[#C0392B]/20 shadow-xl space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-white/70 shrink-0"><Megaphone size={22} /></div>
                        <div className="flex-1">
                            <p className="font-bold text-white text-sm">傳愛（三層審核制）</p>
                            <p className="text-[10px] text-gray-500">訂金 +1,000 · 完款 +3,000</p>
                        </div>
                    </div>

                    {!showW4Form ? (
                        <button
                            onClick={() => setShowW4Form(true)}
                            className="w-full py-3.5 rounded-2xl font-black text-sm bg-[#C0392B] text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
                        >
                            <Ticket size={14} />提交傳愛申請
                        </button>
                    ) : (
                        <form onSubmit={handleW4Submit} className="space-y-3 text-left">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">被介紹對象 *</label>
                                <input required value={w4Target} onChange={e => setW4Target(e.target.value)}
                                    placeholder="例：王小明"
                                    className="w-full mt-1 bg-[#16213E] border border-[#253A5C] rounded-2xl p-3.5 text-white font-bold outline-none focus:border-[#C0392B] text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">傳愛類型</label>
                                <div className="flex gap-2 mt-1">
                                    {(['b1', 'b2'] as const).map(type => (
                                        <button key={type} type="button"
                                            onClick={() => setW4BonusType(type)}
                                            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all
                                                ${w4BonusType === type ? 'bg-[#C0392B] text-white' : 'bg-[#16213E] text-gray-400 hover:bg-[#253A5C]'}`}
                                        >
                                            {type === 'b1' ? '訂金 +1,000' : '完款 +3,000'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">日期 *</label>
                                <input required type="date" value={w4Date} onChange={e => setW4Date(e.target.value)}
                                    className="w-full mt-1 bg-[#16213E] border border-[#253A5C] rounded-2xl p-3.5 text-white font-bold outline-none focus:border-[#C0392B] text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">簡述（選填）</label>
                                <textarea value={w4Desc} onChange={e => setW4Desc(e.target.value)}
                                    rows={2} placeholder="簡述推薦情況…"
                                    className="w-full mt-1 bg-[#16213E] border border-[#253A5C] rounded-2xl p-3.5 text-white font-bold outline-none focus:border-[#C0392B] text-sm resize-none" />
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setShowW4Form(false)}
                                    className="flex-1 py-3 bg-[#16213E] text-gray-400 font-bold rounded-2xl text-sm">取消</button>
                                <button type="submit" disabled={isSubmittingW4}
                                    className="flex-1 py-3 bg-[#C0392B] text-white font-black rounded-2xl text-sm active:scale-95 transition-all disabled:opacity-50">
                                    {isSubmittingW4 ? '提交中…' : '確認送出'}
                                </button>
                            </div>
                        </form>
                    )}

                    {bonusApplications.filter((a: BonusApplication) => a.quest_id.startsWith('w4|')).length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-[#253A5C]">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">申請記錄</p>
                            {bonusApplications.filter((a: BonusApplication) => a.quest_id.startsWith('w4|')).map((app: BonusApplication) => {
                                const si = BONUS_STATUS_LABELS[app.status] ?? { label: app.status, color: 'text-gray-400' };
                                return (
                                    <div key={app.id} className="bg-[#16213E] rounded-2xl p-3.5 space-y-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-white text-sm">{app.interview_target}</p>
                                                <p className="text-[10px] text-gray-500">{app.interview_date}</p>
                                            </div>
                                            <span className={`text-[10px] font-black ${si.color}`}>{si.label}</span>
                                        </div>
                                        {app.description && <p className="text-[10px] text-gray-400 italic">{app.description}</p>}
                                        {app.status === 'rejected' && (app.final_review_notes || app.squad_review_notes) && (
                                            <p className="text-[10px] text-[#C0392B] font-bold">駁回原因：{app.final_review_notes || app.squad_review_notes}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* ── b3–b10 其他加分任務申請 ── */}
            <section className="space-y-3">
                <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">其他加分任務申請</h2>
                <div className="space-y-2">
                    {BONUS_CONFIG.map(cfg => {
                        // b3：逐選項追蹤，計算尚未提交（非已駁回）的剩餘選項
                        const b3AvailableOpts = cfg.id === 'b3'
                            ? B3_OPTIONS.filter(opt =>
                                !bonusApps.some(a => a.quest_id === `b3|${opt}` && a.status !== 'rejected')
                            )
                            : B3_OPTIONS;

                        // b3 使用 per-option 判斷；其他 non-repeatable 以 existingApp 判斷
                        const existingApp = cfg.id === 'b3' ? undefined : bonusApps.find(a =>
                            a.quest_id === cfg.id || a.quest_id.startsWith(cfg.id + '|')
                        );
                        const isApproved = cfg.id === 'b3'
                            ? b3AvailableOpts.length === 0
                            : existingApp?.status === 'approved';
                        const isPending = cfg.id === 'b3'
                            ? false
                            : !!(existingApp && existingApp.status !== 'rejected' && existingApp.status !== 'approved');
                        const isOpen = activeBonusForm === cfg.id;

                        return (
                            <div key={cfg.id} className={`rounded-2xl border p-4 space-y-3 transition-all ${
                                isApproved ? 'bg-[#C0392B]/10 border-[#C0392B]/30 opacity-60'
                                : isPending ? 'bg-yellow-500/5 border-yellow-500/20'
                                : 'bg-[#1B2A4A] border-[#16213E]'
                            }`}>
                                <div className="flex items-center gap-3">
                                    {(() => {
                                        const BIcon = BONUS_ICON_MAP[cfg.id];
                                        return BIcon
                                            ? <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-white/70 shrink-0"><BIcon size={20} /></div>
                                            : <span className="text-2xl shrink-0">{cfg.icon}</span>;
                                    })()}
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-bold text-sm ${isApproved ? 'text-[#C0392B]' : 'text-white'}`}>{cfg.title}</p>
                                        <p className="text-[10px] text-gray-500">{cfg.sub}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`font-black text-sm ${isApproved ? 'text-[#C0392B]' : 'text-[#F5C842]'}`}>+{cfg.reward.toLocaleString()}</p>
                                        {isPending && <p className="text-[9px] text-yellow-400 font-bold">審核中</p>}
                                        {isApproved && <p className="text-[9px] text-[#C0392B] font-bold">已入帳</p>}
                                    </div>
                                </div>

                                {/* 申請按鈕 or 展開表單 */}
                                {!isApproved && !isPending && (
                                    <>
                                        {!isOpen ? (
                                            <button
                                                onClick={() => { setActiveBonusForm(cfg.id); setBonusDate(getLogicalDateStr(new Date())); }}
                                                className="w-full py-2.5 rounded-xl bg-[#16213E] border border-[#253A5C] text-gray-400 font-bold text-xs hover:border-[#F5C842]/50 hover:text-[#F5C842] transition-colors"
                                            >
                                                + 提交申請
                                            </button>
                                        ) : (
                                            <form onSubmit={handleBonusSubmit} className="space-y-2 text-left animate-in slide-in-from-top-2 duration-200">
                                                {(cfg.id === 'b3' || cfg.id === 'b7') ? (
                                                    <select
                                                        required
                                                        value={bonusTarget}
                                                        onChange={e => setBonusTarget(e.target.value)}
                                                        className="w-full bg-[#16213E] border border-[#253A5C] rounded-xl px-3 py-2.5 text-white text-sm font-bold outline-none focus:border-[#F5C842] appearance-none cursor-pointer"
                                                    >
                                                        <option value="">{cfg.id === 'b3' ? '選擇報名課程…' : '選擇課程場次…'}</option>
                                                        {(cfg.id === 'b3' ? b3AvailableOpts : B7_OPTIONS).map(option => (
                                                            <option key={option} value={option}>{option}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        required
                                                        value={bonusTarget}
                                                        onChange={e => setBonusTarget(e.target.value)}
                                                        placeholder={
                                                            cfg.id === 'b4' ? '學員系統編號（官網可以查看）'
                                                            : cfg.id === 'b8' ? '學員系統編號（官網可以查看）'
                                                            : cfg.id === 'b9' ? '輔導員姓名／完成日期說明'
                                                            : cfg.id === 'b10' ? '挑戰計劃說明'
                                                            : cfg.id === 'b11' ? '學員系統編號（官網可以查看）'
                                                            : cfg.id === 'b12' ? '對象（例：父親、伴侶）'
                                                            : '說明'
                                                        }
                                                        className="w-full bg-[#16213E] border border-[#253A5C] rounded-xl px-3 py-2.5 text-white text-sm font-bold outline-none focus:border-[#F5C842] placeholder:text-gray-600"
                                                    />
                                                )}
                                                {cfg.id === 'b3' && B3_OPTIONS.some(opt =>
                                                    bonusApps.some(a => a.quest_id === `b3|${opt}` && a.status !== 'rejected')
                                                ) && (
                                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                                        {B3_OPTIONS.filter(opt =>
                                                            bonusApps.some(a => a.quest_id === `b3|${opt}` && a.status !== 'rejected')
                                                        ).map(opt => {
                                                            const app = bonusApps.find(a => a.quest_id === `b3|${opt}` && a.status !== 'rejected');
                                                            const done = app?.status === 'approved';
                                                            return (
                                                                <span key={opt} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${done ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40' : 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/30'}`}>
                                                                    {done ? '✓' : '⏳'} {opt}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                <input
                                                    required
                                                    type="date"
                                                    value={bonusDate}
                                                    onChange={e => setBonusDate(e.target.value)}
                                                    className="w-full bg-[#16213E] border border-[#253A5C] rounded-xl px-3 py-2.5 text-white text-sm font-bold outline-none focus:border-[#F5C842]"
                                                />
                                                <textarea
                                                    value={bonusDesc}
                                                    onChange={e => setBonusDesc(e.target.value)}
                                                    rows={2}
                                                    placeholder="備註（選填）"
                                                    className="w-full bg-[#16213E] border border-[#253A5C] rounded-xl px-3 py-2.5 text-white text-sm font-bold outline-none focus:border-[#F5C842] resize-none placeholder:text-gray-600"
                                                />
                                                {(cfg.id === 'b5' || cfg.id === 'b6') && (
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">上傳截圖 (必填)</label>
                                                        <div className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-[#253A5C] rounded-xl bg-[#16213E] hover:border-[#F5C842]/50 hover:bg-[#16213E]/80 transition-colors cursor-pointer relative">
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={e => setBonusScreenshot(e.target.files?.[0] || null)}
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                            />
                                                            <Upload size={14} className="text-gray-500" />
                                                            <span className="text-xs text-gray-500 font-bold">
                                                                {bonusScreenshot ? bonusScreenshot.name : '點擊上傳截圖或拖拽'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={() => { setActiveBonusForm(null); setBonusScreenshot(null); }} className="flex-1 py-2.5 bg-[#16213E] text-gray-400 font-bold rounded-xl text-sm">取消</button>
                                                    <button
                                                        type="submit"
                                                        disabled={isSubmittingBonus || isUploadingScreenshot || !bonusTarget.trim() || ((cfg.id === 'b5' || cfg.id === 'b6') && !bonusScreenshot)}
                                                        className="flex-2 py-2.5 bg-[#F5C842] text-black font-black rounded-xl text-sm active:scale-95 transition-all disabled:opacity-50">
                                                        {isUploadingScreenshot ? '上傳中…' : isSubmittingBonus ? '提交中…' : '確認送出'}
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </>
                                )}

                                {/* 既有申請的狀態 */}
                                {existingApp && existingApp.status === 'rejected' && (
                                    <p className="text-[10px] text-[#C0392B] font-bold">⚠️ 上次申請已退回：{existingApp.final_review_notes || existingApp.squad_review_notes || '無備註'}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ── 道在江湖紀錄片參與加分 ── */}
            {battalionDocumentary && (
                <section className="space-y-3">
                    <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">道在江湖紀錄片參與加分</h2>
                    <div className={`rounded-2xl border p-4 space-y-3 ${
                        docMemberApp?.status === 'approved' ? 'bg-[#C0392B]/10 border-[#C0392B]/30 opacity-60'
                        : docMemberApp ? 'bg-yellow-500/5 border-yellow-500/20'
                        : 'bg-[#1B2A4A] border-[#16213E]'
                    }`}>
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-white/70 shrink-0">
                                <Clapperboard size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`font-bold text-sm ${docMemberApp?.status === 'approved' ? 'text-[#C0392B]' : 'text-white'}`}>
                                    道在江湖紀錄片參與加分
                                </p>
                                <p className="text-[10px] text-gray-500 mt-0.5">有實際參與拍攝的隊員可申請，由小隊長審核後入帳</p>
                                <a
                                    href={battalionDocumentary.interview_target}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-blue-400 underline mt-1 block truncate"
                                >
                                    {battalionDocumentary.interview_target}
                                </a>
                            </div>
                            <div className="text-right shrink-0">
                                <p className={`font-black text-sm ${docMemberApp?.status === 'approved' ? 'text-[#C0392B]' : 'text-[#F5C842]'}`}>+10,000</p>
                                {docMemberApp && docMemberApp.status !== 'rejected' && (
                                    <p className={`text-[9px] font-bold ${BONUS_STATUS_LABELS[docMemberApp.status]?.color || 'text-gray-400'}`}>
                                        {docMemberApp.status === 'approved' ? '已入帳' : '審核中'}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* 狀態顯示或申請按鈕 */}
                        {!docMemberApp || docMemberApp.status === 'rejected' ? (
                            <button
                                onClick={async () => {
                                    if (!onSubmitDocParticipation) return;
                                    setIsSubmittingDocPart(true);
                                    await onSubmitDocParticipation();
                                    setIsSubmittingDocPart(false);
                                }}
                                disabled={isSubmittingDocPart || !onSubmitDocParticipation}
                                className="w-full py-2.5 rounded-xl bg-[#F5C842] text-black font-black text-xs hover:bg-[#F5C842]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmittingDocPart ? '提交中…' : '申請參與加分 +10,000'}
                            </button>
                        ) : (
                            <div className={`text-center text-xs font-bold py-2 rounded-xl bg-black/20 ${BONUS_STATUS_LABELS[docMemberApp.status]?.color || 'text-gray-400'}`}>
                                {BONUS_STATUS_LABELS[docMemberApp.status]?.label || docMemberApp.status}
                            </div>
                        )}

                        {docMemberApp?.status === 'rejected' && (
                            <p className="text-[10px] text-[#C0392B] font-bold">
                                ⚠️ 上次申請已退回：{docMemberApp.squad_review_notes || '無備註'}
                            </p>
                        )}
                    </div>
                </section>
            )}

            {/* ── 臨時加碼任務 ── */}
            {temporaryQuests.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">⏳ 臨時加碼任務</h2>
                    {temporaryQuests.map(tq => {
                        const isMax = logs.filter(l => l.QuestID.startsWith(tq.id)).length >= 1;
                        return (
                            <div key={tq.id} className={`p-5 rounded-3xl bg-[#1B2A4A] border border-blue-500/20 relative overflow-hidden ${isMax ? 'opacity-50' : ''}`}>
                                <div className="absolute top-0 right-0 bg-blue-600/20 text-blue-400 px-3 py-1 rounded-bl-xl text-[9px] font-black uppercase tracking-widest">官方加碼</div>
                                <div className="flex items-center gap-3 mb-4 mt-2">
                                    <span className="text-3xl">🎬</span>
                                    <div className="flex-1">
                                        <p className="font-bold text-white text-sm">{tq.title}</p>
                                        {tq.sub && <p className="text-[10px] text-blue-300">{tq.sub}</p>}
                                        {tq.desc && <p className="text-[10px] text-gray-500 mt-0.5">{tq.desc}</p>}
                                    </div>
                                    <p className="font-black text-blue-400">+{tq.reward.toLocaleString()}</p>
                                </div>
                                <div className="flex justify-between items-center">
                                    {['一', '二', '三', '四', '五', '六', '日'].map((day, idx) => {
                                        const d = new Date();
                                        const cd = d.getDay() || 7;
                                        d.setDate(d.getDate() + (idx + 1 - cd));
                                        const qId = `${tq.id}|${getLogicalDateStr(d)}`;
                                        const isDone = logs.some(l => l.QuestID === qId);
                                        return (
                                            <div key={idx} className="flex flex-col items-center gap-1.5">
                                                <span className="text-[10px] text-gray-500 font-mono">{d.getMonth() + 1}/{d.getDate()}</span>
                                                <button onClick={() => isDone ? onUndo({ ...tq, id: qId }) : (!isMax && onCheckIn({ ...tq, id: qId }))}
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${isDone ? 'bg-[#C0392B] text-white' : 'bg-[#16213E] text-gray-500 hover:bg-[#253A5C]'}`}
                                                >{day}</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </section>
            )}
        </div>
    );
}
