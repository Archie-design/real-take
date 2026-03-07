import React from 'react';
import { Quest, DailyLog, SystemSettings, TemporaryQuest } from '@/types';
import { WEEKLY_QUEST_CONFIG } from '@/lib/constants';
import { getLogicalDateStr } from '@/lib/utils/time';

interface WeeklyTopicTabProps {
    systemSettings: SystemSettings;
    logs: DailyLog[];
    currentWeeklyMonday: Date;
    isTopicDone: boolean;
    temporaryQuests: TemporaryQuest[];
    userInventory: string[];
    onCheckIn: (q: Quest) => void;
    onUndo: (q: Quest) => void;
}

export function WeeklyTopicTab({ systemSettings, logs, currentWeeklyMonday, isTopicDone, temporaryQuests, userInventory, onCheckIn, onUndo }: WeeklyTopicTabProps) {
    return (
        <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 text-center mx-auto text-center">
            <div className="p-8 rounded-4xl border-2 border-yellow-500/50 bg-yellow-500/5 shadow-2xl relative overflow-hidden text-center mx-auto">
                <div className="flex items-center gap-6 mb-6 text-left text-center justify-center">
                    <div className="text-6xl mx-auto">🎯</div>
                    <div className="flex-1">
                        <span className="bg-yellow-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase mb-1 inline-block">雙週挑戰</span>
                        <h3 className="text-2xl font-black text-white italic uppercase">主題親證</h3>
                        <p className="text-sm text-yellow-400 font-bold mt-1 italic">「{systemSettings.TopicQuestTitle}」</p>
                    </div>
                    <div className="text-sm font-black text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-xl">+1000</div>
                </div>
                <button
                    onClick={() => !isTopicDone ? onCheckIn({ id: 't1', title: '主題親證', reward: 1000 }) : onUndo({ id: 't1', title: '主題親證', reward: 1000 })}
                    className={`w-full py-4 rounded-2xl font-black text-lg transition-all ${isTopicDone ? 'bg-emerald-600/20 text-emerald-400 shadow-inner' : 'bg-yellow-500 text-slate-950 shadow-lg active:scale-95'}`}>
                    {isTopicDone ? "本期已圓滿 (點擊回溯) ✓" : "回報主題修行"}
                </button>
            </div>

            {WEEKLY_QUEST_CONFIG.map(q => {
                const comps = logs.filter(l => l.QuestID.startsWith(q.id) && new Date(l.Timestamp) >= currentWeeklyMonday).length;
                const isMax = q.limit !== 99 && comps >= (q.limit || 0);
                return (
                    <div key={q.id} className={`p-8 rounded-4xl bg-slate-900 border border-white/5 shadow-2xl ${isMax ? 'opacity-50 grayscale' : ''}`}>
                        <div className="flex items-center gap-6 mb-8 text-left text-center justify-center mx-auto">
                            <div className="text-6xl mx-auto">{q.icon}</div>
                            <div className="flex-1 text-left">
                                <h3 className="text-2xl font-black text-white">{q.title}</h3>
                                <p className="text-sm text-slate-400 font-bold italic">{q.sub}</p>
                            </div>
                            <div className="text-sm font-black text-blue-400 bg-blue-400/10 px-3 py-1 rounded-xl">+$ {q.reward}</div>
                        </div>
                        <div className="flex justify-between items-center px-2 mx-auto">
                            {['一', '二', '三', '四', '五', '六', '日'].map((day, idx) => {
                                const d = new Date();
                                const currentDay = d.getDay() || 7;
                                const diff = (idx + 1) - currentDay;
                                d.setDate(d.getDate() + diff);
                                const qId = `${q.id}|${getLogicalDateStr(d)}`;
                                const isDone = logs.some(l => l.QuestID === qId);
                                return (
                                    <div key={idx} className="flex flex-col items-center gap-1.5">
                                        <span className="text-[10px] text-slate-500 font-mono tracking-tighter">{d.getMonth() + 1}/{d.getDate()}</span>
                                        <button title={`${day}`} onClick={() => !isDone ? (!isMax && onCheckIn({ ...q, id: qId })) : onUndo({ ...q, id: qId })} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${isDone ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>{day}</button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
            {userInventory.includes('a6') && (() => {
                const PREFIX = 'bd_yuanmeng';
                const weekComps = logs.filter(l => l.QuestID.startsWith(PREFIX) && new Date(l.Timestamp) >= currentWeeklyMonday).length;
                const weekFull = weekComps >= 3;
                return (
                    <div className="pt-8 border-t-2 border-slate-800 border-dashed space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-xl font-black text-purple-400 uppercase tracking-widest">🪬 親證圓夢計劃</h3>
                            <span className="text-xs font-black text-slate-500">{weekComps} / 3 次</span>
                        </div>
                        <div className="p-8 rounded-4xl bg-purple-950/20 border border-purple-500/30 shadow-2xl">
                            <div className="flex items-center gap-4 mb-6 justify-center">
                                <div className="text-5xl">🪬</div>
                                <div className="text-left">
                                    <h4 className="text-xl font-black text-white">親證圓夢計劃</h4>
                                    <p className="text-xs text-purple-300 font-bold mt-1">持有定風珠專屬 · 每週上限 3 次 · 每次 +300 修為</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center px-2">
                                {['一', '二', '三', '四', '五', '六', '日'].map((day, idx) => {
                                    const d = new Date();
                                    const currentDay = d.getDay() || 7;
                                    const diff = (idx + 1) - currentDay;
                                    d.setDate(d.getDate() + diff);
                                    const qId = `${PREFIX}|${getLogicalDateStr(d)}`;
                                    const isDone = logs.some(l => l.QuestID === qId);
                                    const isDisabled = !isDone && weekFull;
                                    return (
                                        <div key={idx} className="flex flex-col items-center gap-1.5">
                                            <span className="text-[10px] text-slate-500 font-mono tracking-tighter">{d.getMonth() + 1}/{d.getDate()}</span>
                                            <button
                                                title={day}
                                                disabled={isDisabled}
                                                onClick={() => !isDone ? onCheckIn({ id: qId, title: '親證圓夢計劃', reward: 300, dice: 0 }) : onUndo({ id: qId, title: '親證圓夢計劃', reward: 300, dice: 0 })}
                                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${isDone ? 'bg-purple-500 text-white shadow-lg' : isDisabled ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                                            >{day}</button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {temporaryQuests.length > 0 && (
                <div className="pt-8 border-t-2 border-slate-800 border-dashed space-y-8">
                    <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest text-center">⏳ 臨時加分任務</h3>
                    {temporaryQuests.map(tq => {
                        // 特殊仙緣任務：每個日期 QuestID 全程唯一，不重置
                        const comps = logs.filter(l => l.QuestID.startsWith(tq.id)).length;
                        const isMax = comps >= 1;
                        return (
                            <div key={tq.id} className={`p-8 rounded-4xl bg-slate-900 border border-emerald-500/20 shadow-2xl relative overflow-hidden ${isMax ? 'opacity-50 grayscale' : ''}`}>
                                <div className="absolute top-0 right-0 bg-emerald-600/20 text-emerald-500 px-3 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest">
                                    大會臨時發布
                                </div>
                                <div className="flex items-center gap-6 mb-8 text-left text-center justify-center mx-auto mt-2">
                                    <div className="text-6xl mx-auto">✨</div>
                                    <div className="flex-1 text-left">
                                        <h3 className="text-2xl font-black text-white">{tq.title}</h3>
                                        {tq.sub && <p className="text-sm text-orange-300 font-bold mt-1">{tq.sub}</p>}
                                        {tq.desc && <p className="text-xs text-slate-400 mt-1 italic">{tq.desc}</p>}
                                    </div>
                                    <div className="text-sm font-black text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-xl">+$ {tq.reward}</div>
                                </div>
                                <div className="flex justify-between items-center px-2 mx-auto">
                                    {['一', '二', '三', '四', '五', '六', '日'].map((day, idx) => {
                                        const d = new Date();
                                        const currentDay = d.getDay() || 7;
                                        const diff = (idx + 1) - currentDay;
                                        d.setDate(d.getDate() + diff);
                                        const qId = `${tq.id}|${getLogicalDateStr(d)}`;
                                        const isDone = logs.some(l => l.QuestID === qId);
                                        return (
                                            <div key={idx} className="flex flex-col items-center gap-1.5">
                                                <span className="text-[10px] text-slate-500 font-mono tracking-tighter">{d.getMonth() + 1}/{d.getDate()}</span>
                                                <button title={`${day}`} onClick={() => !isDone ? (!isMax && onCheckIn({ ...tq, id: qId })) : onUndo({ ...tq, id: qId })} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${isDone ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>{day}</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
