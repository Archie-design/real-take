import React from 'react';
import { LogOut, Coins } from 'lucide-react';
import { CharacterStats } from '@/types';
import { ROLE_CURE_MAP, getExpForNextLevel } from '@/lib/constants';

interface HeaderProps {
    userData: CharacterStats | null;
    onLogout: () => void;
}

export function Header({ userData, onLogout }: HeaderProps) {
    let progressPercent = 0;
    let expInCurrentLevel = 0;
    let nextLevelExp = 0;

    if (userData) {
        let accumulatedExp = 0;
        for (let i = 1; i < userData.Level; i++) {
            accumulatedExp += i * 5 + 480;
        }
        expInCurrentLevel = userData.Exp - accumulatedExp;
        nextLevelExp = getExpForNextLevel(userData.Level);
        progressPercent = userData.Level >= 99 ? 100 : Math.min(100, Math.max(0, (expInCurrentLevel / nextLevelExp) * 100));
    }

    return (
        <header className="px-6 py-8 bg-slate-900 border-b border-white/10 flex items-center gap-6 relative justify-center">
            <button
                onClick={onLogout}
                className="absolute top-6 right-6 bg-slate-950/50 border border-white/5 p-2 rounded-xl text-slate-600 hover:text-red-400">
                <LogOut size={20} />
            </button>

            <div className="relative shrink-0 mx-auto text-center">
                {userData?.Role && ROLE_CURE_MAP[userData.Role] ? (
                    <img
                        src={`/images/avatars/${userData.Role}.png`}
                        alt={userData.Role}
                        className="w-24 h-24 rounded-4xl shadow-lg mx-auto object-cover"
                    />
                ) : (
                    <div className="w-24 h-24 bg-orange-600 rounded-4xl flex items-center justify-center text-white text-5xl font-black shadow-lg mx-auto">
                        {userData?.Name?.[0]}
                    </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-slate-950 text-[10px] font-black px-2 py-1 rounded-full border-4 border-slate-900">
                    LV.{userData?.Level}
                </div>
            </div>

            <div className="flex-1 text-left">
                <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-3xl font-black text-white">{userData?.Name}</h1>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-black text-white ${userData ? ROLE_CURE_MAP[userData.Role]?.color : ''}`}>
                        {userData ? ROLE_CURE_MAP[userData.Role]?.poison : ''}
                    </span>
                </div>
                <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">{userData?.Role} 修行中</p>
                        <div className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-lg text-[10px] font-black shadow-inner border border-yellow-500/20">
                            <Coins size={12} /> {userData?.Coins || 0}
                        </div>

                    </div>
                    <p className="text-[10px] text-slate-400 font-mono tracking-tighter mix-blend-screen">{userData?.Level! >= 99 ? 'MAX' : `${expInCurrentLevel} / ${nextLevelExp}`}</p>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-white/5 relative shadow-inner">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 shadow-[0_0_10px_rgba(249,115,22,0.5)] transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                </div>
            </div>
        </header>
    );
}
