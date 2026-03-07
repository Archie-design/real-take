import { useState } from 'react';
import { ShieldAlert, Dices } from 'lucide-react';
import { DAILY_QUEST_CONFIG } from '@/lib/constants';
import { TeamSettings } from '@/types';

interface CaptainTabProps {
    teamName: string;
    teamSettings?: TeamSettings;
    onDrawWeeklyQuest: () => Promise<void>;
}

function getCurrentWeekMondayStr(): string {
    const now = new Date();
    const day = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(monday.getDate() - (day - 1));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().slice(0, 10);
}

export function CaptainTab({ teamName, teamSettings, onDrawWeeklyQuest }: CaptainTabProps) {
    const [isDrawing, setIsDrawing] = useState(false);

    const weekMondayStr = getCurrentWeekMondayStr();
    const alreadyDrawnThisWeek = teamSettings?.mandatory_quest_week === weekMondayStr;
    const currentQuestId = teamSettings?.mandatory_quest_id;
    const currentQuestName = DAILY_QUEST_CONFIG.find(q => q.id === currentQuestId)?.title;
    const drawHistory: string[] = teamSettings?.quest_draw_history || [];
    const remaining = DAILY_QUEST_CONFIG.filter(q => q.id.startsWith('q') && !drawHistory.includes(q.id));

    const handleDraw = async () => {
        setIsDrawing(true);
        await onDrawWeeklyQuest();
        setIsDrawing(false);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-indigo-950/40 border-2 border-indigo-500/40 rounded-4xl p-6 shadow-2xl text-center mx-auto">
                <div className="flex items-center justify-center gap-2 text-indigo-400 font-black text-xs uppercase mb-2 tracking-widest"><ShieldAlert size={16} /> 隊長權限指揮所</div>
                <h2 className="text-2xl font-black text-white italic mx-auto">{teamName || '未知小隊'}</h2>
                <p className="text-xs text-indigo-300 mt-2 font-black">你擁有點亮同伴前行的提燈。請謹慎決策。</p>
            </div>

            <section className="bg-slate-900 border-2 border-slate-800 p-8 rounded-4xl space-y-6 shadow-xl text-center">
                <h3 className="text-lg font-black text-white border-b border-white/10 pb-4 text-left">🎲 本週推薦定課抽籤</h3>

                {alreadyDrawnThisWeek && currentQuestName ? (
                    <div className="space-y-3">
                        <p className="text-xs text-slate-400 font-bold">本週已抽出</p>
                        <div className="bg-indigo-900/30 border-2 border-indigo-500/50 rounded-3xl p-6">
                            <p className="text-3xl font-black text-white">「{currentQuestName}」</p>
                            <p className="text-xs text-indigo-400 mt-2 font-bold">週一 {weekMondayStr} 起生效</p>
                        </div>
                        <p className="text-xs text-slate-500">下週一前無法再次抽籤</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-xs text-slate-400 font-bold leading-relaxed">
                            每週一 12:00 前抽選本週推薦定課。<br />
                            已抽過的定課不重複，{remaining.length > 0 ? `尚餘 ${remaining.length} 項可抽` : '本輪已全部抽完，下次抽籤將重置循環'}。
                        </p>
                        <button
                            disabled={isDrawing}
                            onClick={handleDraw}
                            className="w-full flex items-center justify-center gap-3 bg-indigo-600 p-5 rounded-2xl text-white font-black text-lg shadow-lg hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-50"
                        >
                            <Dices size={22} /> {isDrawing ? '命運抽籤中...' : '🎲 抽選本週定課'}
                        </button>
                    </div>
                )}

                {drawHistory.length > 0 && (
                    <div className="text-left space-y-2 mt-2">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">本輪已抽歷程</p>
                        <div className="flex flex-wrap gap-2">
                            {drawHistory.map(id => {
                                const name = DAILY_QUEST_CONFIG.find(q => q.id === id)?.title || id;
                                return (
                                    <span key={id} className={`px-3 py-1 rounded-xl text-xs font-bold ${id === currentQuestId ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                        {name}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
