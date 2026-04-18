'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Trophy, Award, RefreshCw, Check, X, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import {
    ACHIEVEMENT_CATALOG,
    RARITY_META,
} from '@/lib/achievements/catalog';
import {
    manualUnlockAchievement,
    manualRevokeAchievement,
    recomputeAllAchievements,
    getAchievementStats,
} from '@/app/actions/achievements';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface UserLite {
    UserID: string;
    Name: string;
}

interface AchievementsPanelProps {
    actorName: string;
}

export function AchievementsPanel({ actorName }: AchievementsPanelProps) {
    const [users, setUsers] = useState<UserLite[]>([]);
    const [unlocksByUser, setUnlocksByUser] = useState<Record<string, Set<number>>>({});
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserLite | null>(null);
    const [stats, setStats] = useState<{ totalUsers: number; counts: Record<string, number> } | null>(null);
    const [loading, setLoading] = useState(false);
    const [recomputing, setRecomputing] = useState(false);
    const [msg, setMsg] = useState<string>('');

    const loadAll = async () => {
        setLoading(true);
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const [usersRes, achRes, statsRes] = await Promise.all([
            supabase.from('CharacterStats').select('UserID, Name').order('Name'),
            supabase.from('Achievements').select('user_id, achievement_id'),
            getAchievementStats(),
        ]);
        if (usersRes.data) setUsers(usersRes.data as UserLite[]);
        const map: Record<string, Set<number>> = {};
        for (const row of achRes.data ?? []) {
            const uid = row.user_id as string;
            const aid = parseInt(String(row.achievement_id), 10);
            if (!map[uid]) map[uid] = new Set();
            map[uid].add(aid);
        }
        setUnlocksByUser(map);
        setStats(statsRes);
        setLoading(false);
    };

    useEffect(() => {
        // Defer to next microtask to avoid linter's "setState synchronously in effect" warning
        const id = setTimeout(() => { void loadAll(); }, 0);
        return () => clearTimeout(id);
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return users;
        return users.filter(u => u.Name?.toLowerCase().includes(q) || u.UserID?.toLowerCase().includes(q));
    }, [users, search]);

    const handleToggle = async (user: UserLite, achievementId: number, currentlyUnlocked: boolean) => {
        const res = currentlyUnlocked
            ? await manualRevokeAchievement(actorName, user.UserID, user.Name, achievementId)
            : await manualUnlockAchievement(actorName, user.UserID, user.Name, achievementId);
        if (res.success) {
            setUnlocksByUser(prev => {
                const next = { ...prev };
                const set = new Set(next[user.UserID] ?? []);
                if (currentlyUnlocked) set.delete(achievementId); else set.add(achievementId);
                next[user.UserID] = set;
                return next;
            });
            setMsg(currentlyUnlocked ? '已撤銷' : '已解鎖');
        } else {
            setMsg('操作失敗：' + (res.error || ''));
        }
    };

    const handleRecompute = async () => {
        if (!confirm('確定對所有學員重新評估成就？（可能需要數秒）')) return;
        setRecomputing(true);
        const res = await recomputeAllAchievements(actorName);
        setRecomputing(false);
        if (res.success) {
            setMsg(`重算完成：${res.processed} 位學員，新解鎖 ${res.newlyUnlocked} 筆`);
            await loadAll();
        } else {
            setMsg('重算失敗：' + (res.error || ''));
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <Trophy className="text-amber-400" size={18} />
                    <h3 className="text-base font-black text-white">成就管理</h3>
                </div>
                <button
                    onClick={handleRecompute}
                    disabled={recomputing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-black disabled:opacity-50 min-h-[36px]"
                >
                    {recomputing ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                    全員重算
                </button>
            </div>

            {msg && <div className="text-xs text-amber-300">{msg}</div>}

            {stats && (
                <div className="text-[11px] text-gray-400 bg-slate-900/50 rounded-2xl p-3">
                    總學員數 {stats.totalUsers}；解鎖紀錄共{' '}
                    {Object.values(stats.counts).reduce((a, b) => a + b, 0)} 筆。
                </div>
            )}

            {/* Per-achievement unlock rate */}
            {stats && (
                <details className="bg-slate-900/50 rounded-2xl p-3">
                    <summary className="text-xs font-black text-white cursor-pointer">各成就解鎖率</summary>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
                        {ACHIEVEMENT_CATALOG.map(def => {
                            const n = stats.counts[String(def.id)] ?? 0;
                            const pct = stats.totalUsers > 0 ? ((n / stats.totalUsers) * 100).toFixed(0) : '0';
                            const meta = RARITY_META[def.rarity];
                            return (
                                <div key={def.id} className="flex items-center gap-2">
                                    <span className={`w-6 font-mono ${meta.text}`}>#{def.id}</span>
                                    <span className="flex-1 truncate text-gray-300">{def.description}</span>
                                    <span className="text-amber-300 font-mono">{n}（{pct}%）</span>
                                </div>
                            );
                        })}
                    </div>
                </details>
            )}

            {/* User search + selection */}
            <div className="bg-slate-900/50 rounded-2xl p-3 space-y-3">
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="搜尋學員姓名 / ID"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500"
                />
                <div className="max-h-48 overflow-y-auto space-y-1">
                    {loading && <div className="text-xs text-gray-500">載入中…</div>}
                    {filtered.slice(0, 50).map(u => {
                        const count = unlocksByUser[u.UserID]?.size ?? 0;
                        const active = selectedUser?.UserID === u.UserID;
                        return (
                            <button
                                key={u.UserID}
                                onClick={() => setSelectedUser(u)}
                                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-sm min-h-[44px] ${
                                    active ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-gray-200 hover:bg-slate-700'
                                }`}
                            >
                                <span className="truncate">{u.Name || u.UserID}</span>
                                <span className="text-xs font-mono shrink-0">{count}/{ACHIEVEMENT_CATALOG.length}</span>
                            </button>
                        );
                    })}
                    {!loading && filtered.length > 50 && (
                        <div className="text-[10px] text-gray-500">（僅顯示前 50 筆，請輸入關鍵字縮小範圍）</div>
                    )}
                </div>
            </div>

            {/* Selected user grid */}
            {selectedUser && (
                <div className="bg-slate-900/50 rounded-2xl p-3 space-y-3">
                    <div className="flex items-center gap-2">
                        <Award className="text-amber-400" size={16} />
                        <span className="text-sm font-black text-white">{selectedUser.Name}</span>
                        <span className="text-[10px] text-gray-500 font-mono">{selectedUser.UserID}</span>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {ACHIEVEMENT_CATALOG.map(def => {
                            const unlocked = unlocksByUser[selectedUser.UserID]?.has(def.id) ?? false;
                            const meta = RARITY_META[def.rarity];
                            return (
                                <button
                                    key={def.id}
                                    onClick={() => handleToggle(selectedUser, def.id, unlocked)}
                                    title={`#${def.id} ${def.description}`}
                                    className={`relative aspect-square rounded-xl border-2 ${meta.border} ${meta.bg} p-1 transition-transform hover:scale-[1.05] ${
                                        unlocked ? '' : 'opacity-40'
                                    }`}
                                >
                                    <img
                                        src={`/achievements/${def.id}.png`}
                                        alt=""
                                        className={`w-full h-full object-contain ${unlocked ? '' : 'grayscale'}`}
                                    />
                                    <span className="absolute top-0.5 left-0.5 text-[9px] font-mono text-white/80">#{def.id}</span>
                                    {unlocked ? (
                                        <Check className="absolute bottom-0.5 right-0.5 text-emerald-400 bg-slate-900/80 rounded-full p-0.5" size={14} />
                                    ) : (
                                        <X className="absolute bottom-0.5 right-0.5 text-gray-600 bg-slate-900/80 rounded-full p-0.5" size={14} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[10px] text-gray-500">點擊圖示即可手動解鎖 / 撤銷，會寫入 AdminLogs。</p>
                </div>
            )}
        </div>
    );
}
