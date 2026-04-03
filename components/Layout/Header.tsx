import React from 'react';
import { LogOut } from 'lucide-react';
import { CharacterStats } from '@/types';
import { getExpForNextLevel, getAccumulatedExpForLevel } from '@/lib/constants';

interface HeaderProps {
    userData: CharacterStats | null;
    onLogout: () => void;
}

export function Header({ userData, onLogout }: HeaderProps) {
    let progressPercent = 0;
    let expInCurrentLevel = 0;
    let nextLevelExp = 0;

    if (userData) {
        const currentLevelStartExp = getAccumulatedExpForLevel(userData.Level);
        expInCurrentLevel = userData.Exp - currentLevelStartExp;
        nextLevelExp = getExpForNextLevel(userData.Level);
        progressPercent = userData.Level >= 99 ? 100 : Math.min(100, Math.max(0, (expInCurrentLevel / nextLevelExp) * 100));
    }

    return (
        <header className="px-6 py-6 bg-[#16213E] border-b border-[#253A5C] flex items-center gap-4 relative">
            <div className="relative shrink-0">
                <div className="w-16 h-16 bg-[#C0392B] rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-lg">
                    {userData?.Name?.[0]}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-[#F5C842] text-[#16213E] text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-[#16213E]">
                    LV.{userData?.Level}
                </div>
            </div>

            <div className="flex-1 min-w-0 pr-12">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <h1 className="text-xl font-black text-white truncate">{userData?.Name}</h1>
                    <div className="bg-[#F5C842]/10 border border-[#F5C842]/20 px-2 py-0.5 rounded-lg shrink-0">
                        <span className="text-[9px] font-black text-[#F5C842]">票房累積中</span>
                    </div>
                </div>
                <p className="text-[8px] text-[#F5C842]/40 font-black uppercase tracking-[0.25em] mb-1">這不是電影</p>
                <div className="flex justify-between items-end mb-1.5">
                    <p className="text-[9px] text-[rgba(255,255,255,0.35)] font-bold uppercase tracking-widest italic truncate">{userData?.SquadName} 劇組</p>
                    <p className="text-[10px] text-[rgba(255,255,255,0.45)] font-mono tracking-tighter mix-blend-screen shrink-0">{userData?.Level! >= 99 ? 'MAX' : `${expInCurrentLevel} / ${nextLevelExp} 票房`}</p>
                </div>
                <div className="w-full bg-[#1B2A4A] h-1.5 rounded-full overflow-hidden border border-[#253A5C] relative shadow-inner">
                    <div
                        className="h-full bg-gradient-to-r from-[#C0392B] to-[#F5C842] shadow-[0_0_10px_rgba(192,57,43,0.5)] transition-all duration-1000"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            <button
                onClick={onLogout}
                aria-label="登出"
                className="absolute top-1/2 -translate-y-1/2 right-6 bg-[#1B2A4A] border border-[#253A5C] p-2.5 rounded-xl text-[rgba(255,255,255,0.35)] hover:text-red-400 hover:border-red-900/40 transition-all duration-150 cursor-pointer active:scale-95 shadow-md">
                <LogOut size={18} />
            </button>
        </header>
    );
}
