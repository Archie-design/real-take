'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { Trophy, Lock, Sparkles, X } from 'lucide-react';
import {
    ACHIEVEMENT_CATALOG,
    ACHIEVEMENT_MAP,
    RARITY_META,
    RARITY_COUNTS,
    type AchievementDef,
    type Rarity,
} from '@/lib/achievements/catalog';
import type { PlayerAchievement } from '@/types';

interface AchievementsTabProps {
    unlocks: PlayerAchievement[];
}

const RARITY_ORDER: Rarity[] = ['legendary', 'super_rare', 'rare', 'common'];

export function AchievementsTab({ unlocks }: AchievementsTabProps) {
    const [selected, setSelected] = useState<number | null>(null);
    const [filter, setFilter] = useState<Rarity | 'all'>('all');

    // map unlocks → Map<achId(number), PlayerAchievement>
    const unlockMap = useMemo(() => {
        const m = new Map<number, PlayerAchievement>();
        for (const u of unlocks) {
            const id = parseInt(u.achievement_id, 10);
            if (!Number.isNaN(id)) m.set(id, u);
        }
        return m;
    }, [unlocks]);

    const unlockedCount = unlockMap.size;
    const unlockedByRarity = useMemo(() => {
        const out: Record<Rarity, number> = { common: 0, rare: 0, super_rare: 0, legendary: 0 };
        for (const id of unlockMap.keys()) {
            const def = ACHIEVEMENT_MAP.get(id);
            if (def) out[def.rarity]++;
        }
        return out;
    }, [unlockMap]);

    const visibleList = useMemo(() => {
        const list = filter === 'all'
            ? ACHIEVEMENT_CATALOG
            : ACHIEVEMENT_CATALOG.filter(a => a.rarity === filter);
        return list;
    }, [filter]);

    const selectedDef = selected != null ? ACHIEVEMENT_MAP.get(selected) : null;
    const selectedUnlock = selected != null ? unlockMap.get(selected) : null;

    return (
        <div className="space-y-6 animate-in zoom-in-95 duration-500">
            {/* ── Summary Header ───────────────────────────────────── */}
            <div className="bg-[#1B2A4A] border-2 border-[#253A5C] rounded-[2rem] p-5 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                    <Trophy className="text-amber-400" size={20} />
                    <h2 className="text-lg font-black text-white tracking-wide">片廠榮耀</h2>
                    <span className="ml-auto text-xs text-gray-400 font-bold">
                        {unlockedCount} / {RARITY_COUNTS.total}
                    </span>
                </div>

                <div className="space-y-2">
                    {RARITY_ORDER.map(r => {
                        const total = RARITY_COUNTS[r];
                        const unlocked = unlockedByRarity[r];
                        const pct = total > 0 ? (unlocked / total) * 100 : 0;
                        const meta = RARITY_META[r];
                        return (
                            <div key={r} className="flex items-center gap-3">
                                <span className={`text-[10px] font-black w-14 ${meta.text}`}>{meta.label}</span>
                                <div className="flex-1 h-2 bg-slate-800/80 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${meta.bg} border-r ${meta.border}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <span className="text-[10px] text-gray-400 font-mono w-10 text-right">
                                    {unlocked}/{total}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Filter tabs ──────────────────────────────────────── */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
                    全部
                </FilterButton>
                {RARITY_ORDER.map(r => (
                    <FilterButton key={r} active={filter === r} onClick={() => setFilter(r)}>
                        {RARITY_META[r].label}
                    </FilterButton>
                ))}
            </div>

            {/* ── Grid ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {visibleList.map(def => (
                    <AchievementCard
                        key={def.id}
                        def={def}
                        unlock={unlockMap.get(def.id) ?? null}
                        onOpen={setSelected}
                    />
                ))}
            </div>

            {/* ── Detail Modal ──────────────────────────────────────── */}
            {selectedDef && (
                <DetailModal
                    def={selectedDef}
                    unlock={selectedUnlock ?? null}
                    onClose={() => setSelected(null)}
                />
            )}
        </div>
    );
}

// ── Filter button ────────────────────────────────────────────
function FilterButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all min-h-[36px] ${
                active
                    ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30'
                    : 'bg-[#1B2A4A] text-gray-400 border border-[#253A5C] hover:border-amber-500/50'
            }`}
        >
            {children}
        </button>
    );
}

// ── Card ─────────────────────────────────────────────────────
function AchievementCard({
    def,
    unlock,
    onOpen,
}: {
    def: AchievementDef;
    unlock: PlayerAchievement | null;
    onOpen: (id: number) => void;
}) {
    const meta = RARITY_META[def.rarity];
    const unlocked = unlock != null;

    return (
        <button
            onClick={() => onOpen(def.id)}
            className={`relative group rounded-2xl p-2 border-2 ${meta.border} ${meta.bg} text-left min-h-[140px] flex flex-col items-center gap-1.5 transition-transform hover:scale-[1.02] ${
                unlocked ? `shadow-lg ${meta.glow}` : 'opacity-60'
            }`}
        >
            <div className="relative w-20 h-20 md:w-24 md:h-24">
                <Image
                    src={`/achievements/${def.id}.png`}
                    alt={def.description}
                    fill
                    sizes="(max-width:768px) 80px, 96px"
                    className={`object-contain ${unlocked ? '' : 'grayscale brightness-50'}`}
                />
                {!unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Lock className="text-gray-500" size={24} />
                    </div>
                )}
            </div>
            <div className={`text-[10px] font-black tracking-wide ${meta.text}`}>{meta.label}</div>
            <div className="text-[10px] text-gray-200 line-clamp-2 text-center px-0.5">
                {def.description}
            </div>
            {unlocked && (
                <Sparkles className="absolute top-1.5 right-1.5 text-amber-400" size={14} />
            )}
        </button>
    );
}

// ── Detail Modal ─────────────────────────────────────────────
function DetailModal({
    def,
    unlock,
    onClose,
}: {
    def: AchievementDef;
    unlock: PlayerAchievement | null;
    onClose: () => void;
}) {
    const meta = RARITY_META[def.rarity];
    const unlocked = unlock != null;

    return (
        <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className={`relative w-full max-w-md rounded-3xl border-2 ${meta.border} ${meta.bg} p-6 shadow-2xl ${meta.glow}`}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center text-gray-400 hover:text-white"
                    aria-label="關閉"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center gap-3">
                    <div className="relative w-32 h-32 md:w-40 md:h-40">
                        <Image
                            src={`/achievements/${def.id}.png`}
                            alt={def.description}
                            fill
                            sizes="160px"
                            className={`object-contain ${unlocked ? '' : 'grayscale brightness-50'}`}
                        />
                        {!unlocked && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Lock className="text-gray-500" size={40} />
                            </div>
                        )}
                    </div>

                    <div className={`text-xs font-black tracking-widest ${meta.text}`}>
                        {meta.label} · #{def.id}
                    </div>

                    <div className="text-center space-y-2 w-full">
                        <p className="italic text-gray-300 text-sm leading-relaxed">「{def.hint}」</p>
                        <div className="border-t border-white/10 my-2" />
                        <p className="text-white font-bold">{def.description}</p>
                        {unlocked && unlock && (
                            <p className="text-[11px] text-amber-400 font-mono mt-3">
                                解鎖於 {new Date(unlock.unlocked_at).toLocaleDateString('zh-TW')}
                                {unlock.unlock_source === 'admin_manual' && '（管理員補發）'}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
