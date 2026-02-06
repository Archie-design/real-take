"use client";

import React, { useState, useEffect, useMemo } from 'react';
// 在本地 VS Code 開發時，請務必執行：npm install @supabase/supabase-js
// 這裡使用的是標準的 npm 匯入路徑。
import { createClient, SupabaseClient } from '@supabase/supabase-js'; 
import { 
  Flame, 
  Trophy, 
  LogOut,
  Shield,
  Brain,
  Heart,
  Zap,
  Sparkles,
  Dice5,
  AlertTriangle,
  CheckCircle2,
  Activity,
  MessageSquare,
  ChevronRight,
  Settings,
  Target
} from 'lucide-react';

// --- 0. 型別定義 (TypeScript Interfaces) ---

interface CharacterStats {
  UserID: string;
  Name: string;
  Role: string;
  Level: number;
  Exp: number;
  EnergyDice: number;
  Spirit: number;
  Physique: number;
  Charisma: number;
  Savvy: number;
  Luck: number;
  Potential: number;
  Streak: number;
  LastCheckIn: string | null;
}

interface DailyLog {
  id?: string;
  Timestamp: string;
  UserID: string;
  QuestID: string;
  QuestTitle: string;
  RewardPoints: number;
}

interface Quest {
  id: string;
  title: string;
  sub: string;
  reward: number;
  dice?: number;
  icon?: string;
  limit?: number;
}

// --- 1. Supabase 初始化 (加入 TypeScript 防錯) ---

const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 只有在變數存在時才初始化，避免伺服器端或編譯時報錯
let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

// --- 2. 技術規格設定 ---

const ROLE_CURE_MAP: Record<string, { poison: string; color: string; cureTaskId: string; bonusStat: keyof CharacterStats }> = {
  '孫悟空': { poison: '破嗔', color: 'bg-red-500', cureTaskId: 'q2', bonusStat: 'Spirit' },
  '豬八戒': { poison: '破貪', color: 'bg-emerald-500', cureTaskId: 'q6', bonusStat: 'Physique' },
  '沙悟淨': { poison: '破痴', color: 'bg-purple-500', cureTaskId: 'q4', bonusStat: 'Savvy' },
  '白龍馬': { poison: '破慢', color: 'bg-orange-500', cureTaskId: 'q5', bonusStat: 'Charisma' },
  '唐三藏': { poison: '破疑', color: 'bg-blue-500', cureTaskId: 'q3', bonusStat: 'Potential' }
};

const DAILY_QUEST_CONFIG: Quest[] = [
  { id: 'q1', title: '打拳', sub: '身體開發', reward: 200, dice: 1 },
  { id: 'q2', title: '感恩冥想', sub: '對治嗔心', reward: 100, dice: 1 },
  { id: 'q3', title: '當下之舞', sub: '對治疑心', reward: 100, dice: 1 },
  { id: 'q4', title: '嗯啊吽七次', sub: '對治痴念', reward: 100, dice: 1 },
  { id: 'q5', title: '五感恩', sub: '對治慢心', reward: 100, dice: 1 },
  { id: 'q6', title: '海鮮素', sub: '對治貪慾', reward: 100, dice: 1 },
  { id: 'q7', title: '子時入睡', sub: '能量補給', reward: 100, dice: 1 }
];

const WEEKLY_QUEST_CONFIG: Quest[] = [
  { id: 'w1', title: '小天使通話', sub: '關心夥伴 (15min)', reward: 500, limit: 1, icon: '👼' },
  { id: 'w2', title: '參加心成活動', sub: '聚會、活動、培訓', reward: 500, limit: 2, icon: '🏛️' },
  { id: 'w3', title: '與家人互動親證', sub: '視訊或品質陪伴', reward: 500, limit: 1, icon: '🏠' },
  { id: 'w4', title: '傳愛分數', sub: '訪談成功加分', reward: 1000, limit: 99, icon: '❤️' }
];

// --- 3. 核心演算法 (修正 TypeScript Implicit Any 錯誤) ---

const normalizePhone = (phone: string | number | undefined): string => {
  if (!phone) return "";
  let p = phone.toString().replace(/\D/g, '').trim();
  if (p.length === 10 && p.startsWith('0')) p = p.substring(1);
  return p;
};

const getBiWeeklyMonday = (): Date => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const weekNum = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() || 7) - 1));
  if (weekNum % 2 === 0) monday.setDate(monday.getDate() - 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

// --- 4. UI 子組件 ---

const StatCard = ({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) => (
  <div className="bg-slate-900 border-2 border-slate-800 p-5 rounded-[2.5rem] shadow-xl text-left">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-xs font-black text-slate-500 tracking-widest uppercase">{label}</span>
    </div>
    <div className="flex items-center gap-4">
      <span className="text-4xl font-black text-white">{value || 0}</span>
      <div className="h-2.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} opacity-70 transition-all duration-1000`} 
          style={{ width: `${Math.min(100, ((value || 0) / 50) * 100)}%` }}
        ></div>
      </div>
    </div>
  </div>
);

// --- 5. 主要 App 元件 ---

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'stats'>('daily');
  const [userData, setUserData] = useState<CharacterStats | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [systemSettings, setSystemSettings] = useState({ MandatoryQuestId: 'q2', TopicQuestTitle: '載入中...' });

  const todayStr = new Date().toDateString();
  const currentBiWeeklyMonday = useMemo(() => getBiWeeklyMonday(), []);

  // 防錯：如果 Supabase 環境變數缺失，顯示引導畫面
  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-slate-200">
        <AlertTriangle size={64} className="text-yellow-500 mb-6" />
        <h1 className="text-3xl font-black mb-4">Supabase 環境變數未設定</h1>
        <p className="text-slate-400 max-w-md mb-8">請在專案根目錄建立 .env.local 檔案並填入 Supabase URL 與 Key。</p>
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-left font-mono text-sm text-emerald-400 w-full max-w-md">
          <p>NEXT_PUBLIC_SUPABASE_URL=你的_URL</p>
          <p>NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_ANON_KEY</p>
        </div>
      </div>
    );
  }

  // 1. 初始化讀取系統設定
  useEffect(() => {
    async function fetchSettings() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase.from('SystemSettings').select('*');
        if (!error && data) {
          const settingsObj = data.reduce((acc: any, curr: any) => ({ ...acc, [curr.SettingName]: curr.Value }), {});
          setSystemSettings({
            MandatoryQuestId: settingsObj.MandatoryQuestId || 'q2',
            TopicQuestTitle: settingsObj.TopicQuestTitle || '未公佈主題'
          });
        }
      } catch (err) {
        console.error("Settings fetch error:", err);
      }
    }
    fetchSettings();
  }, []);

  // 2. 登入邏輯
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const inputName = (formData.get('name') as string).trim();
    const phoneSuffix = (formData.get('phone') as string).trim();

    try {
      const { data, error } = await supabase.from('CharacterStats').select('*');
      if (error) throw error;

      const userMatch = (data as CharacterStats[]).find(u => 
        u.Name === inputName && normalizePhone(u.UserID).endsWith(phoneSuffix)
      );

      if (userMatch) {
        setUserData(userMatch);
        const { data: userLogs } = await supabase
          .from('DailyLogs')
          .select('*')
          .eq('UserID', userMatch.UserID);
        setLogs((userLogs as DailyLog[]) || []);
        setIsLoggedIn(true);
      } else {
        alert("找不到靈魂印記，請確認姓名與手機末三碼。");
      }
    } catch (err) {
      alert("資料庫連線失敗。");
    } finally {
      setLoading(false);
    }
  };

  // 3. 打卡處理
  const handleCheckIn = async (quest: Quest) => {
    if (!supabase || !userData) return;
    
    const dailyDoneCount = logs.filter(l => 
      new Date(l.Timestamp).toDateString() === todayStr && l.QuestID.startsWith('q')
    ).length;
    
    if (dailyDoneCount >= 3 && quest.id.startsWith('q')) {
      alert("今日定課已達 3 項上限");
      return;
    }

    setLoading(true);
    const now = new Date();
    const roleConfig = ROLE_CURE_MAP[userData.Role];
    const isCureTask = roleConfig?.cureTaskId === quest.id;
    const rewardPoints = quest.reward;

    try {
      const { error: logError } = await supabase.from('DailyLogs').insert([{
        Timestamp: now.toISOString(),
        UserID: userData.UserID,
        QuestID: quest.id,
        QuestTitle: quest.title + (isCureTask ? " (天命對治)" : ""),
        RewardPoints: rewardPoints
      }]);
      if (logError) throw logError;

      let newExp = (parseInt(userData.Exp.toString()) || 0) + rewardPoints;
      let newLevel = parseInt(userData.Level.toString()) || 1;
      if (newExp >= newLevel * 1000) {
        newLevel += 1;
      }

      const updatePayload: Partial<CharacterStats> = {
        Exp: newExp,
        Level: newLevel,
        EnergyDice: (parseInt(userData.EnergyDice.toString()) || 0) + (quest.dice || 0),
        LastCheckIn: now.toDateString()
      };

      if (isCureTask && roleConfig.bonusStat) {
        const statField = roleConfig.bonusStat;
        (updatePayload as any)[statField] = (parseInt((userData as any)[statField].toString()) || 0) + 2;
      }

      const { error: statsError } = await supabase
        .from('CharacterStats')
        .update(updatePayload)
        .eq('UserID', userData.UserID);
      if (statsError) throw statsError;

      setUserData({ ...userData, ...updatePayload } as CharacterStats);
      setLogs(prev => [...prev, { 
        QuestID: quest.id, 
        Timestamp: now.toISOString(), 
        RewardPoints: rewardPoints,
        UserID: userData.UserID,
        QuestTitle: quest.title
      }]);
      
    } catch (err) {
      console.error(err);
      alert("資料同步失敗。");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn || !userData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-10 space-y-12 bg-slate-950 text-center text-slate-200">
        <div className="animate-in zoom-in duration-700 flex flex-col items-center">
          <div className="w-32 h-32 bg-orange-600 rounded-[3.5rem] flex items-center justify-center shadow-2xl border-4 border-white/20 mb-6">
            <span className="text-7xl">🕉️</span>
          </div>
          <h1 className="text-5xl font-black tracking-widest mb-2">星光西遊</h1>
          <p className="text-orange-400 text-lg font-bold uppercase tracking-[0.4em]">修行轉生門戶</p>
        </div>
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-6">
          <input name="name" required className="w-full bg-slate-900/60 border-2 border-slate-800 rounded-2xl p-6 text-white text-center text-xl focus:border-orange-500 outline-none transition-all" placeholder="冒險者姓名" />
          <input name="phone" required type="password" className="w-full bg-slate-900/60 border-2 border-slate-800 rounded-2xl p-6 text-white text-center text-xl focus:border-orange-500 outline-none transition-all" placeholder="手機末三碼" />
          <button disabled={loading} className="w-full py-7 rounded-[2.5rem] bg-gradient-to-r from-orange-600 to-yellow-500 text-slate-950 font-black text-2xl shadow-2xl active:scale-95 transition-all">
            {loading ? "讀取天書中..." : "連結靈魂印記"}
          </button>
        </form>
      </div>
    );
  }

  const level = parseInt(userData.Level.toString()) || 1;
  const exp = parseInt(userData.Exp.toString()) || 0;
  const expToNext = level * 1000;
  const expProgress = (exp / expToNext) * 100;
  const isTopicDone = logs.some(l => l.QuestID === 't1' && new Date(l.Timestamp) >= currentBiWeeklyMonday);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-32 text-center">
      <header className="p-8 bg-slate-900 border-b border-slate-800 shadow-2xl relative overflow-hidden text-center text-slate-200">
        <div className="absolute top-0 right-0 p-6">
          <button onClick={() => setIsLoggedIn(false)} className="bg-slate-950/50 border border-slate-800 p-2 rounded-xl text-slate-500 hover:text-red-400 transition-colors">
            <LogOut size={20} />
          </button>
        </div>
        <div className="max-w-md mx-auto flex items-center gap-6 text-left">
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 bg-orange-600 rounded-[2.2rem] flex items-center justify-center text-white text-5xl font-black shadow-lg">
              {userData.Name ? userData.Name[0] : '?'}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-slate-950 text-sm font-black px-3 py-1 rounded-full border-4 border-slate-900 shadow-lg text-center">
              LV.{level}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-black text-white">{userData.Name}</h1>
              <span className={`text-[10px] px-2 py-0.5 rounded font-black text-white ${ROLE_CURE_MAP[userData.Role]?.color || 'bg-slate-500'}`}>
                {ROLE_CURE_MAP[userData.Role]?.poison || '未知'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-bold mb-3 uppercase tracking-widest italic text-left">{userData.Role} 模組</p>
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700">
              <div className="h-full bg-gradient-to-r from-orange-600 to-yellow-400 transition-all duration-1000" style={{ width: `${expProgress}%` }}></div>
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-black text-slate-500">
               <span>修為進度</span><span>{exp} / {expToNext}</span>
            </div>
          </div>
        </div>
      </header>

      <nav className="flex gap-2 p-4 bg-slate-950 sticky top-0 z-20 border-b border-slate-900 shadow-lg max-w-md mx-auto">
        <button onClick={() => setActiveTab('daily')} className={`flex-1 py-5 rounded-[1.5rem] text-base font-black transition-all ${activeTab === 'daily' ? 'bg-orange-600 text-white shadow-xl' : 'bg-slate-900 text-slate-500'}`}>今日定課</button>
        <button onClick={() => setActiveTab('weekly')} className={`flex-1 py-5 rounded-[1.5rem] text-base font-black transition-all ${activeTab === 'weekly' ? 'bg-orange-600 text-white shadow-xl' : 'bg-slate-900 text-slate-500'}`}>每週/主題</button>
        <button onClick={() => setActiveTab('stats')} className={`flex-1 py-5 rounded-[1.5rem] text-base font-black transition-all ${activeTab === 'stats' ? 'bg-orange-600 text-white shadow-xl' : 'bg-slate-900 text-slate-500'}`}>六維</button>
      </nav>

      <main className="max-w-md mx-auto p-6 space-y-8 text-center">
        {activeTab === 'daily' && (
          <div className="space-y-4">
            <div className="bg-red-900/30 border-2 border-red-500/50 rounded-[2rem] p-6 shadow-2xl text-center">
              <div className="flex items-center gap-3 mb-2 font-black text-red-400 justify-center">
                <Flame size={20} />
                <h2 className="text-base uppercase tracking-widest">本週指定必修</h2>
              </div>
              <p className="text-lg text-slate-200 font-bold">「{DAILY_QUEST_CONFIG.find(q => q.id === systemSettings.MandatoryQuestId)?.title || "載入中"}」</p>
              <p className="text-red-500 font-black mt-2 text-xs italic">⚠️ 未完成將於結算時扣除 50 分</p>
            </div>

            {DAILY_QUEST_CONFIG.map(q => {
              const isDone = logs.some(l => new Date(l.Timestamp).toDateString() === todayStr && l.QuestID === q.id);
              const isCure = ROLE_CURE_MAP[userData.Role]?.cureTaskId === q.id;
              const isMandatory = q.id === systemSettings.MandatoryQuestId;
              
              return (
                <div 
                  key={q.id}
                  onClick={() => !isDone && handleCheckIn(q)}
                  className={`p-7 rounded-[2.5rem] border-2 transition-all flex flex-col gap-4 relative ${
                    isDone ? 'bg-emerald-950/20 border-emerald-500/40 opacity-60' : 
                    isMandatory ? 'bg-slate-900 border-red-600 scale-[1.02]' :
                    'bg-slate-900 border-slate-800 hover:border-orange-500/50 cursor-pointer shadow-lg'
                  } ${isCure && !isDone ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : ''}`}
                >
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-2xl font-black ${isDone ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-orange-500'}`}>
                      {isDone ? "✓" : "✧"}
                    </div>
                    <div className="flex-1 text-left text-white">
                      <h3 className={`text-xl font-black ${isDone ? 'text-emerald-400' : 'text-white'}`}>{q.title}</h3>
                      <p className="text-sm text-slate-500 font-bold">{q.sub}</p>
                    </div>
                    <div className="text-right">
                       <span className="text-base font-black text-orange-500">+{q.reward}</span>
                       {isCure && <div className="text-[10px] text-yellow-500 font-black tracking-tighter">屬性加成</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'weekly' && (
          <div className="space-y-8 text-center text-slate-200">
            <div className="p-8 rounded-[3rem] border-2 border-yellow-500/50 bg-yellow-500/5 shadow-2xl relative overflow-hidden text-center">
              <div className="flex items-center gap-6 mb-6 text-left text-white">
                <div className="text-6xl text-center">🎯</div>
                <div className="flex-1 text-left">
                  <span className="bg-yellow-500 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-black uppercase mb-1 inline-block text-center">雙週主題挑戰</span>
                  <h3 className="text-2xl font-black text-left">主題親證</h3>
                  <p className="text-sm text-yellow-400 font-bold leading-tight mt-1 italic text-left">「{systemSettings.TopicQuestTitle}」</p>
                </div>
                <div className="text-sm font-black text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-xl text-center">+1000</div>
              </div>
              <button 
                disabled={isTopicDone}
                onClick={() => handleCheckIn({ id: 't1', title: '主題親證', reward: 1000, sub: '雙週挑戰' })}
                className={`w-full py-4 rounded-2xl font-black text-lg transition-all ${isTopicDone ? 'bg-emerald-600/20 text-emerald-400 cursor-not-allowed' : 'bg-yellow-500 text-slate-950 shadow-lg active:scale-95'}`}
              >
                {isTopicDone ? "本期已圓滿 ✓" : "回報主題修行"}
              </button>
            </div>

            {WEEKLY_QUEST_CONFIG.map(q => {
              const comps = logs.filter(l => l.QuestID.startsWith(q.id)).length;
              const isMax = q.limit !== 99 && comps >= (q.limit || 0);
              return (
                <div key={q.id} className={`p-8 rounded-[3rem] bg-slate-900 border border-slate-800 shadow-2xl ${isMax ? 'opacity-50 grayscale' : ''}`}>
                  <div className="flex items-center gap-6 mb-8 text-left text-white">
                    <div className="text-6xl text-center">{q.icon}</div>
                    <div className="flex-1 text-left">
                      <h3 className="text-2xl font-black text-left">{q.title}</h3>
                      <p className="text-sm text-slate-400 font-bold italic text-left">{q.sub}</p>
                    </div>
                    <div className="text-sm font-black text-blue-400 bg-blue-400/10 px-3 py-1 rounded-xl text-center">+${q.reward}</div>
                  </div>
                  <div className="flex justify-between items-center px-2">
                    {['一','二','三','四','五','六','日'].map((day, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => !isMax && handleCheckIn({ ...q, id: `${q.id}|${idx}` })}
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-slate-800 text-slate-500 hover:bg-slate-700 active:bg-blue-600 transition-all text-center"
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 gap-5">
            <StatCard label="神識 (Spirit)" value={userData.Spirit} icon={<Sparkles size={16} className="text-purple-400" />} color="bg-purple-500" />
            <StatCard label="根骨 (Physique)" value={userData.Physique} icon={<Shield size={16} className="text-red-400" />} color="bg-red-500" />
            <StatCard label="魅力 (Charisma)" value={userData.Charisma} icon={<Heart size={16} className="text-pink-400" />} color="bg-pink-500" />
            <StatCard label="悟性 (Savvy)" value={userData.Savvy} icon={<Brain size={16} className="text-blue-400" />} color="bg-blue-500" />
            <StatCard label="機緣 (Luck)" value={userData.Luck} icon={<Zap size={16} className="text-emerald-400" />} color="bg-emerald-500" />
            <StatCard label="潛力 (Potential)" value={userData.Potential} icon={<Trophy size={16} className="text-yellow-400" />} color="bg-yellow-500" />
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent pointer-events-none text-center z-30">
        <div className="max-w-md mx-auto pointer-events-auto text-center">
          <button 
            disabled={(parseInt(userData.EnergyDice.toString()) || 0) < 3}
            className={`w-full py-7 rounded-[2.5rem] font-black text-2xl shadow-2xl flex items-center justify-center gap-4 transition-all ${
              (parseInt(userData.EnergyDice.toString()) || 0) >= 3 ? 'bg-gradient-to-r from-orange-600 to-yellow-500 text-slate-950 active:scale-95' : 'bg-slate-800 text-slate-600 opacity-50'
            }`}
          >
            <Dice5 size={32} />
            啟動冒險 (🎲 {userData.EnergyDice || 0})
          </button>
        </div>
      </footer>

      {loading && (
        <div className="fixed inset-0 bg-slate-950/80 z-[100] flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 border-4 border-slate-800 rounded-full loading-spin mb-6 text-center"></div>
          <p className="text-orange-500 text-xl font-black tracking-widest animate-pulse text-center">法界數據傳輸中...</p>
        </div>
      )}
    </div>
  );
}