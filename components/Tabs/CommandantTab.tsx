'use client';

import React, { useState } from 'react';
import { CheckCircle2, XCircle, RefreshCw, Sword, Users, ChevronDown, ChevronUp, Film } from 'lucide-react';
import { CharacterStats, BonusApplication, SquadMemberStats } from '@/types';
import { reviewBonusByAdmin, submitBonusApplication, getBonusApplications } from '@/app/actions/bonus';

interface CommandantTabProps {
    userData: CharacterStats;
    apps: BonusApplication[];
    onRefresh: () => void;
    onShowMessage: (msg: string, type: 'success' | 'error' | 'info') => void;
    battalionMembers?: Record<string, SquadMemberStats[]>;
}

function isActive(lastCheckIn?: string): boolean {
    if (!lastCheckIn) return false;
    const nowTW = new Date(Date.now() + 8 * 3600 * 1000);
    const todayStr = nowTW.toISOString().slice(0, 10);
    const yest = new Date(nowTW);
    yest.setUTCDate(yest.getUTCDate() - 1);
    return lastCheckIn === todayStr || lastCheckIn === yest.toISOString().slice(0, 10);
}

const DOC_DEADLINE = '2026-07-20';

function DocumentarySubmission({
    userData, onRefresh, onShowMessage,
}: Pick<CommandantTabProps, 'userData' | 'onRefresh' | 'onShowMessage'>) {
    const [videoUrl, setVideoUrl] = useState('');
    const [desc, setDesc] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [existingDoc, setExistingDoc] = useState<BonusApplication | null>(null);
    const [loaded, setLoaded] = useState(false);

    React.useEffect(() => {
        getBonusApplications({}).then(res => {
            if (res.success) {
                const doc = res.applications.find(a => a.quest_id === 'doc1' && a.battalion_name === userData.SquadName && a.status !== 'rejected');
                setExistingDoc(doc || null);
            }
            setLoaded(true);
        });
    }, [userData.SquadName]); // eslint-disable-line react-hooks/exhaustive-deps
    const isExpired = new Date().toISOString().slice(0, 10) > DOC_DEADLINE;

    if (!loaded) return <div className="bg-slate-900 border-2 border-amber-500/20 rounded-3xl p-5 text-center text-xs text-slate-500">載入中…</div>;

    if (existingDoc) {
        const statusLabel = { pending: '待審', squad_approved: '待終審', approved: '已核准', rejected: '已駁回' }[existingDoc.status] || existingDoc.status;
        const statusColor = existingDoc.status === 'approved' ? 'text-emerald-400' : existingDoc.status === 'rejected' ? 'text-red-400' : 'text-amber-400';
        return (
            <div className="bg-slate-900 border-2 border-amber-500/20 rounded-3xl p-5 space-y-2">
                <h3 className="text-sm font-black text-white flex items-center gap-2"><Film size={15} className="text-amber-400" /> 道在江湖紀錄片</h3>
                <p className="text-xs text-slate-400">本大隊已提交紀錄片申請</p>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-black ${statusColor}`}>{statusLabel}</span>
                    <span className="text-[10px] text-slate-500">· {existingDoc.interview_target}</span>
                </div>
            </div>
        );
    }

    const handleSubmit = async () => {
        if (!videoUrl.trim()) { onShowMessage('請填入紀錄片連結', 'error'); return; }
        setSubmitting(true);
        try {
            const today = new Date().toISOString().slice(0, 10);
            const res = await submitBonusApplication(
                userData.UserID, userData.Name,
                userData.TeamName || null, userData.SquadName || null,
                'doc1', videoUrl.trim(), today, desc
            );
            if (res.success) {
                onShowMessage('紀錄片已提交，待管理員審核！', 'success');
                onRefresh();
                setVideoUrl(''); setDesc('');
            } else {
                onShowMessage(res.error || '提交失敗', 'error');
            }
        } catch (e: any) {
            onShowMessage('系統異常：' + e.message, 'error');
        } finally { setSubmitting(false); }
    };

    return (
        <div className="bg-slate-900 border-2 border-amber-500/20 rounded-3xl p-5 space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Film size={15} className="text-amber-400" /> 道在江湖紀錄片
                <span className="text-[10px] text-slate-500 font-normal ml-auto">截止 {DOC_DEADLINE}</span>
            </h3>
            <p className="text-xs text-slate-400">大隊全員以愛為出發點製作 3 分鐘紀錄片，需有文字串連或字幕。評分標準：創意、啟發人心。</p>
            {isExpired ? (
                <p className="text-xs text-red-400 font-bold">已超過截止日期</p>
            ) : (
                <>
                    <input
                        type="url"
                        placeholder="紀錄片連結（YouTube / Google Drive 等）"
                        value={videoUrl}
                        onChange={e => setVideoUrl(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-amber-500 transition-colors"
                    />
                    <textarea
                        placeholder="補充說明（選填）"
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        rows={2}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500 resize-none transition-colors"
                    />
                    <button
                        disabled={submitting}
                        onClick={handleSubmit}
                        className="w-full py-3 rounded-xl font-black text-sm text-white bg-amber-600 shadow-lg active:scale-95 transition-all disabled:opacity-50"
                    >
                        {submitting ? '提交中…' : '提交紀錄片'}
                    </button>
                </>
            )}
        </div>
    );
}

export function CommandantTab({ userData, apps, onRefresh, onShowMessage, battalionMembers = {} }: CommandantTabProps) {
    const [reviewingId, setReviewingId] = useState<string | null>(null);
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [expandedSquads, setExpandedSquads] = useState<Record<string, boolean>>({});

    const toggleSquad = (name: string) => setExpandedSquads(prev => ({ ...prev, [name]: !prev[name] }));
    const squadEntries = Object.entries(battalionMembers);

    const handleReview = async (appId: string, action: 'approve' | 'reject') => {
        setReviewingId(appId);
        try {
            const res = await reviewBonusByAdmin(appId, action, notes[appId] || '', userData.Name);
            if (res.success) {
                onShowMessage(
                    action === 'approve' ? '✅ 已核准入帳，電影推廣票房已發放！' : '已駁回此申請。',
                    action === 'approve' ? 'success' : 'info'
                );
                onRefresh();
            } else {
                onShowMessage(res.error || '操作失敗', 'error');
            }
            if (res.warning) onShowMessage(res.warning, 'info');
        } catch (e: any) {
            onShowMessage('系統異常：' + e.message, 'error');
        } finally {
            setReviewingId(null);
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="bg-gradient-to-br from-rose-950/40 to-slate-900 border-2 border-rose-500/40 rounded-4xl p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-rose-400 font-black text-xs uppercase mb-1 tracking-widest">
                            <Sword size={14} /> 發行商長指揮部
                        </div>
                        <h2 className="text-2xl font-black text-white italic">電影推廣終審</h2>
                        <p className="text-xs text-slate-400 mt-1">以下為已通過劇組長初審、待終審的電影推廣申請</p>
                    </div>
                    <button
                        onClick={onRefresh}
                        className="p-3 rounded-2xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 active:scale-95 transition-all border border-white/5"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Battalion member overview */}
            {squadEntries.length > 0 && (
                <div className="bg-slate-900 border-2 border-rose-500/20 rounded-3xl p-5 space-y-4">
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                        <Users size={15} className="text-rose-400" /> 各隊成員票房總覽
                    </h3>
                    <div className="space-y-3">
                        {squadEntries.map(([squadName, members]) => {
                            const activeCount = members.filter(m => isActive(m.lastCheckIn)).length;
                            const rate = members.length > 0 ? Math.round(activeCount / members.length * 100) : 0;
                            const rateColor = rate >= 70 ? 'text-emerald-400' : rate >= 40 ? 'text-amber-400' : 'text-red-400';
                            const rateBg = rate >= 70 ? 'bg-emerald-500/10' : rate >= 40 ? 'bg-amber-500/10' : 'bg-red-500/10';
                            const isOpen = expandedSquads[squadName];
                            return (
                                <div key={squadName} className="bg-slate-800/60 rounded-2xl overflow-hidden">
                                    <button
                                        onClick={() => toggleSquad(squadName)}
                                        className="w-full flex items-center justify-between px-4 py-3 text-left active:bg-slate-700/40 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="font-black text-white text-sm truncate">{squadName}</span>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${rateColor} ${rateBg}`}>
                                                {activeCount}/{members.length} 活躍 · {rate}%
                                            </span>
                                        </div>
                                        {isOpen ? <ChevronUp size={14} className="text-slate-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 shrink-0" />}
                                    </button>
                                    {isOpen && (
                                        <div className="px-4 pb-3 space-y-1.5 border-t border-white/5 pt-2">
                                            {members.map(m => (
                                                <div key={m.UserID} className="flex items-center gap-2">
                                                    <span className="text-xs text-white font-bold flex-1 truncate">
                                                        {m.Name}
                                                        {m.IsCaptain && <span className="text-indigo-400 ml-1 text-[10px]">隊長</span>}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500">Lv.{m.Level}</span>
                                                    {m.Streak > 0 && <span className="text-[10px] text-orange-400">🔥{m.Streak}</span>}
                                                    {isActive(m.lastCheckIn) ? (
                                                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0">活躍</span>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-slate-600 bg-slate-700/50 px-1.5 py-0.5 rounded-full shrink-0">沉寂</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── 道在江湖紀錄片提交 ── */}
            <DocumentarySubmission userData={userData} onRefresh={onRefresh} onShowMessage={onShowMessage} />

            {/* Application list */}
            {apps.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-3xl p-10 text-center">
                    <p className="text-slate-500 font-black text-sm">目前無待終審申請</p>
                    <p className="text-slate-600 text-xs mt-1">所有申請均已處理完畢</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {apps.map(app => (
                        <div key={app.id} className="bg-slate-900 border-2 border-rose-500/20 rounded-3xl p-5 space-y-4 shadow-xl">
                            {/* App info */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-black text-white text-base">{app.user_name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {app.squad_name} · 訪談對象：<span className="text-rose-300">{app.interview_target}</span>
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">日期：{app.interview_date}</p>
                                    {app.squad_review_notes && (
                                        <p className="text-xs text-indigo-400 mt-1.5 bg-indigo-500/10 px-2 py-1 rounded-lg">
                                            劇組長備註：{app.squad_review_notes}
                                        </p>
                                    )}
                                    {app.description && (
                                        <p className="text-xs text-slate-400 italic mt-1.5">「{app.description}」</p>
                                    )}
                                </div>
                                <span className="shrink-0 text-[10px] font-black text-blue-400 bg-blue-400/10 px-2 py-1 rounded-lg">待終審</span>
                            </div>

                            {/* Notes */}
                            <textarea
                                placeholder="終審備註（選填）"
                                value={notes[app.id] || ''}
                                onChange={e => setNotes(prev => ({ ...prev, [app.id]: e.target.value }))}
                                rows={2}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-rose-500 resize-none transition-colors"
                            />

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    disabled={reviewingId === app.id}
                                    onClick={() => handleReview(app.id, 'reject')}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black text-sm text-red-400 bg-red-600/10 border border-red-600/30 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    <XCircle size={14} /> 駁回
                                </button>
                                <button
                                    disabled={reviewingId === app.id}
                                    onClick={() => handleReview(app.id, 'approve')}
                                    className="flex-[2] flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black text-sm text-white bg-emerald-600 shadow-lg shadow-emerald-900/30 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    <CheckCircle2 size={14} /> {reviewingId === app.id ? '處理中…' : '核准入帳'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
