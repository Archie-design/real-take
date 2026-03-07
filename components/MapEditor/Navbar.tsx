import React from 'react';
import { Compass, Cloud, ChevronLeft, User } from 'lucide-react';

interface NavbarProps {
  syncStatus: string;
  view: 'world' | 'editor';
  setView: (view: 'world' | 'editor') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ syncStatus, view, setView }) => {
  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-slate-950/90 border-b border-white/5 backdrop-blur-2xl z-40 shadow-2xl">
      <div className="flex items-center gap-5">
        <div className="p-2.5 bg-gradient-to-tr from-emerald-600 to-teal-400 rounded-xl shadow-lg border border-emerald-500/20">
          <Compass size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-white uppercase italic tracking-widest text-emerald-400">Heart Lotus - Master Plan</h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-bold italic">TypeScript 類型校正版：已補齊缺失圖示</p>
        </div>
      </div>
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 shadow-inner">
          <Cloud size={14} className={syncStatus === 'synced' ? 'text-emerald-400' : 'text-yellow-400 animate-pulse'} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{syncStatus}</span>
        </div>
        {view === 'editor' && (
          <button onClick={() => setView('world')} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-bold border border-emerald-400/20 shadow-lg active:scale-95 transition-all">
            <ChevronLeft size={16} /> 返回世界
          </button>
        )}
        <div className="w-11 h-11 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center hover:border-emerald-500/50 transition-colors">
          <User size={22} className="text-emerald-500" />
        </div>
      </div>
    </nav>
  );
};
