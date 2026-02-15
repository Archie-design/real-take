"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// 使用標準 ESM URL 導入 Supabase，確保在 Canvas 環境中正確解析
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { 
  Flame, Trophy, LogOut, Shield, Brain, Heart, Zap, Sparkles, Dice5,
  AlertTriangle, CheckCircle2, Target, Crown, UserPlus, ArrowRight,
  User as UserIcon, HeartPulse, Home, Briefcase, Coins, Wallet,
  Loader2, RefreshCw, Lock, X, Save, BarChart3, RotateCcw,
  Users, EyeOff, Wind, Snowflake, Droplets, MessageSquare, ChevronRight, Settings, Calendar,
  Ghost, Map as MapIcon, ChevronLeft, User, Wand2, Skull, Footprints
} from 'lucide-react';

// --- 0. 型別定義 (Interfaces) ---

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
  TotalFines: number; 
  CurrentQ: number;
  CurrentR: number;
}

interface DailyLog {
  id: string;
  Timestamp: string;
  UserID: string;
  QuestID: string;
  QuestTitle: string;
  RewardPoints: number;
}

interface Quest {
  id: string;
  title: string;
  sub?: string; 
  reward: number;
  dice?: number;
  icon?: string;
  limit?: number;
}

interface SystemSettings {
  MandatoryQuestId: string;
  TopicQuestTitle: string;
}

interface ZoneInfo {
  id: string;
  name: string;
  char?: string;
  color: string;
  textColor: string;
  icon: React.ReactNode;
}

interface HexPos {
  q: number;
  r: number;
  x: number;
  y: number;
}

interface HexData extends HexPos {
  type: 'center' | 'corridor' | 'subzone';
  terrainId?: string;
  color: string;
  key: string;
  zoneId?: string;
  subIdx?: number;
}

// --- 1. 全域常數與角色模組設定 (定義於外部以解決 ts2304 名稱找不到錯誤) ---

const BASE_START_DATE_STR = "2026-02-01"; 
const PENALTY_PER_DAY = 50; 
const ADVENTURE_COST = 3; 
const ADMIN_PASSWORD = "123"; 

const DEFAULT_CONFIG = {
  CENTER_SIDE: 15,       
  CORRIDOR_W: 5,
  CORRIDOR_L: 60,
  SUBZONE_SIDE: 15,
  HEX_SIZE_WORLD: 8.0,   
  HEX_SIZE_EDITOR: 25,  
};

const ZONES: ZoneInfo[] = [
  { id: 'pride', name: '慢．傲慢之巔', char: '白龍馬', color: '#f8fafc', textColor: 'text-slate-100', icon: <Snowflake size={14}/> },
  { id: 'doubt', name: '疑．迷途森林', char: '唐三藏', color: '#1e3a8a', textColor: 'text-blue-400', icon: <EyeOff size={14}/> },
  { id: 'anger', name: '嗔．焦熱荒原', char: '孫悟空', color: '#991b1b', textColor: 'text-red-500', icon: <Flame size={14}/> },
  { id: 'greed', name: '貪．慾望泥沼', char: '豬八戒', color: '#14532d', textColor: 'text-emerald-500', icon: <Droplets size={14}/> },
  { id: 'delusion', name: '痴．虛妄流沙', char: '沙悟淨', color: '#78350f', textColor: 'text-orange-500', icon: <Wind size={14}/> },
  { id: 'chaos', name: '混沌迷霧', char: 'Boss', color: '#1e293b', textColor: 'text-slate-400', icon: <Ghost size={14}/> },
];

const ROLE_CURE_MAP: Record<string, { 
  poison: string; 
  color: string; 
  cureTaskId: string; 
  bonusStat: keyof CharacterStats;
  talent: string;
  curseName: string;
  curseEffect: string;
  avatar: string;
}> = {
  '孫悟空': { 
    poison: '破嗔', color: 'bg-red-500', cureTaskId: 'q2', bonusStat: 'Spirit',
    talent: '越戰越勇：連續打卡疊加攻擊力，無視迷霧陷阱。',
    curseName: '緊箍咒', curseEffect: '暴躁狀態。移動路徑發生隨機偏移。',
    avatar: '🐒'
  },
  '豬八戒': { 
    poison: '破貪', color: 'bg-emerald-500', cureTaskId: 'q6', bonusStat: 'Physique',
    talent: '福星高照：資源雙倍，滿骰加 HP。',
    curseName: '貪吃誤事', curseEffect: '懶惰狀態。移動消耗加倍。',
    avatar: '🐷'
  },
  '沙悟淨': { 
    poison: '破痴', color: 'bg-purple-500', cureTaskId: 'q4', bonusStat: 'Savvy',
    talent: '捲簾大將：相鄰隊友防禦加成，地形懲罰免疫。',
    curseName: '迷霧障眼', curseEffect: '無明狀態。地圖怪物數值隱藏。',
    avatar: '🐢'
  },
  '白龍馬': { 
    poison: '破慢', color: 'bg-orange-500', cureTaskId: 'q5', bonusStat: 'Charisma',
    talent: '日行千里：移動骰基礎 +2，回收步數。',
    curseName: '傲慢之牆', curseEffect: '孤立狀態。無法團隊 Buff。',
    avatar: '🐎'
  },
  '唐三藏': { 
    poison: '破疑', color: 'bg-blue-500', cureTaskId: 'q3', bonusStat: 'Potential',
    talent: '信念之光：加成傳愛獎勵，範圍回血。',
    curseName: '寸步難行', curseEffect: '懷疑狀態。移動力減半。',
    avatar: '🧘'
  }
};

const DAILY_QUEST_CONFIG: Quest[] = [
  { id: 'q1', title: '打拳', sub: '身體開發', reward: 200, dice: 1 },
  { id: 'q2', title: '感恩冥想', sub: '對治嗔心', reward: 100, dice: 1 },
  { id: 'q3', title: '當下之舞', sub: '對治疑心', reward: 100, dice: 1 },
  { id: 'q4', title: '嗯啊吽七次', sub: '覺醒痴念', reward: 100, dice: 1 },
  { id: 'q5', title: '五感恩', sub: '放下傲慢', reward: 100, dice: 1 },
  { id: 'q6', title: '海鮮素', sub: '節制貪慾', reward: 100, dice: 1 },
  { id: 'q7', title: '子時入睡', sub: '能量補給', reward: 100, dice: 1 }
];

const WEEKLY_QUEST_CONFIG: Quest[] = [
  { id: 'w1', title: '小天使通話', sub: '關心夥伴 (15min)', reward: 500, limit: 1, icon: '👼' },
  { id: 'w2', title: '參加心成活動', sub: '聚會、培訓、活動', reward: 500, limit: 2, icon: '🏛️' },
  { id: 'w3', title: '家人互動親證', sub: '視訊或品質陪伴', reward: 500, limit: 1, icon: '🏠' },
  { id: 'w4', title: '傳愛分數', sub: '訪談成功加分', reward: 1000, limit: 99, icon: '❤️' }
];

const TERRAIN_TYPES: Record<string, any> = {
  grass: { id: 'grass', name: '茵綠草地', url: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png', color: '#1a472a', effect: '【移動】消耗 1 點。' },
  roots: { id: 'roots', name: '世界樹根', url: 'https://cdn-icons-png.flaticon.com/512/4289/4289139.png', color: '#064e3b', effect: '【阻擋】無法通行。' },
  spring: { id: 'spring', name: '能量湧泉', url: 'https://cdn-icons-png.flaticon.com/512/427/427745.png', color: '#38bdf8', effect: '【特殊】回復 10% HP，擲骰 +1。' },
  snow_path: { id: 'snow_path', name: '積雪山徑', url: 'https://cdn-icons-png.flaticon.com/512/2334/2334336.png', color: '#e2e8f0', effect: '【移動】消耗 1 點。' },
  dark_trail: { id: 'dark_trail', name: '幽暗小徑', url: 'https://cdn-icons-png.flaticon.com/512/2590/2590327.png', color: '#1a472a', effect: '【移動】消耗 1 點。' },
};

// --- 2. 初始化 Supabase ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// --- 3. 工具組件 (移至外部解決 ts2304 錯誤) ---

const MessageBox = ({ message, onClose, type = 'info' }: { message: string, onClose: () => void, type?: 'info' | 'error' | 'success' }) => (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
    <div className="bg-slate-900 border-2 border-slate-800 p-8 rounded-4xl shadow-2xl max-w-sm w-full text-center space-y-6 mx-auto">
      <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${type === 'error' ? 'bg-red-500/20 text-red-500' : type === 'success' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-blue-500/20 text-blue-500'}`}>
        {type === 'error' ? <AlertTriangle size={40} /> : type === 'success' ? <CheckCircle2 size={40} /> : <Sparkles size={40} />}
      </div>
      <p className="text-xl font-bold text-white leading-relaxed text-center mx-auto">{message}</p>
      <button onClick={onClose} className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg text-center mx-auto">確認領旨</button>
    </div>
  </div>
);

const StatCard = ({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) => (
  <div className="bg-slate-900 border-2 border-slate-800 p-5 rounded-4xl shadow-xl text-left">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase ml-1">{label}</span>
    </div>
    <div className="flex items-center gap-4">
      <span className="text-4xl font-black text-white">{value || 0}</span>
      <div className="h-2.5 flex-1 bg-slate-800 rounded-full overflow-hidden shadow-inner">
        <div 
          className={`h-full ${color} opacity-70 transition-all duration-1000`} 
          style={{ width: `${Math.min(100, ((value || 0) / 50) * 100)}%` }}
        ></div>
      </div>
    </div>
  </div>
);

// --- 4. 幾何工具 ---
const axialToPixel = (q: number, r: number, size: number): { x: number, y: number } => ({
  x: size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r),
  y: size * (1.5 * r)
});

const getHexPointsStr = (cx: number, cy: number, r: number): string => {
  let points = "";
  for (let i = 0; i < 6; i++) {
    const angle_rad = (Math.PI / 180) * (60 * i - 30);
    points += `${cx + r * Math.cos(angle_rad)},${cy + r * Math.sin(angle_rad)} `;
  }
  return points;
};

const getHexRegion = (radius: number): { q: number, r: number }[] => {
  const results: { q: number, r: number }[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      results.push({ q, r });
    }
  }
  return results;
};

const getHexDist = (q1: number, r1: number, q2: number, r2: number): number => {
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
};

// --- 5. 主要 App 元件 ---

export default function App() {
  // 狀態宣告
  const [view, setView] = useState<'login' | 'register' | 'app' | 'loading' | 'admin' | 'map'>('loading');
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'stats' | 'rank'>('daily');
  const [userData, setUserData] = useState<CharacterStats | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [leaderboard, setLeaderboard] = useState<CharacterStats[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({ MandatoryQuestId: 'q2', TopicQuestTitle: '載入中...' });
  const [modalMessage, setModalMessage] = useState<{ text: string, type: 'info' | 'error' | 'success' } | null>(null);
  const [undoTarget, setUndoTarget] = useState<Quest | null>(null);
  const [adminAuth, setAdminAuth] = useState(false);
  const [mapData, setMapData] = useState<Record<string, string>>({});
  const [hoveredHex, setHoveredHex] = useState<string | null>(null);
  
  // 相機與移動狀態
  const [camX, setCamX] = useState(0);
  const [camY, setCamY] = useState(0);
  const [stepsRemaining, setStepsRemaining] = useState(0);
  const [isRolling, setIsRolling] = useState(false);

  // Refs
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // --- 助手函式與 Hook ---
  const formatCheckInTime = (timestamp: string) => {
    const d = new Date(timestamp);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const getLogicalDate = useCallback((dateInput?: Date | string) => {
    const date = dateInput ? new Date(dateInput) : new Date();
    const hours = date.getHours();
    const d = new Date(date);
    if (hours < 12) d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const logicalTodayStr = getLogicalDate();

  const syncUserFines = useCallback(async (currentStats: CharacterStats, userLogs: DailyLog[]) => {
    const dates: string[] = [];
    const curr = new Date(`${BASE_START_DATE_STR}T12:00:00`); 
    const todayLogical = getLogicalDate();
    let temp = new Date(curr);
    while (true) {
      const tempStr = getLogicalDate(temp);
      dates.push(tempStr);
      if (tempStr === todayLogical) break; 
      temp.setDate(temp.getDate() + 1);
      if (dates.length > 1000) break;
    }
    const checkInDates = new Set(userLogs.filter(l => l.QuestID.startsWith('q')).map(l => getLogicalDate(l.Timestamp)));
    const missedDatesCount = dates.filter(d => !checkInDates.has(d)).length;
    const calculatedFines = missedDatesCount * PENALTY_PER_DAY;
    
    if (currentStats.TotalFines !== calculatedFines) {
      await supabase.from('CharacterStats').update({ TotalFines: calculatedFines }).eq('UserID', currentStats.UserID);
      return calculatedFines;
    }
    return currentStats.TotalFines;
  }, [getLogicalDate]);

  const currentWeeklyMonday = useMemo(() => {
    const now = new Date();
    const day = now.getDay() || 7; 
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day - 1));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, []);

  const isTopicDone = useMemo(() => 
    logs.some(l => l.QuestID === 't1' && new Date(l.Timestamp) >= currentWeeklyMonday),
    [logs, currentWeeklyMonday]
  );

  const roleTrait = useMemo(() => {
    if (!userData) return null;
    const info = ROLE_CURE_MAP[userData.Role];
    if (!info) return null;
    const isCuredToday = logs.some(l => l.QuestID === info.cureTaskId && getLogicalDate(l.Timestamp) === logicalTodayStr);
    return { ...info, isCursed: !isCuredToday };
  }, [userData, logs, logicalTodayStr, getLogicalDate]);

  const axialToPixelPos = useCallback((q: number, r: number, size: number) => axialToPixel(q, r, size), []);

  // --- 定義處理函式 ---

  const handleAdminAuth = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (fd.get('password') === ADMIN_PASSWORD) {
      setAdminAuth(true);
    } else {
      setModalMessage({ text: "密令錯誤，大會禁地不可擅闖。", type: 'error' });
    }
  };

  const updateGlobalSetting = async (key: string, value: string) => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('SystemSettings').update({ Value: value }).eq('SettingName', key);
      if (error) throw error;
      setSystemSettings(prev => ({ ...prev, [key]: value }));
      setModalMessage({ text: "設定已同步雲端，諸位修行者將即時感應。", type: 'success' });
    } catch (err) {
      setModalMessage({ text: "同步失敗，法陣連線異常。", type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRollDice = () => {
    if (!userData || isRolling || stepsRemaining > 0) return;
    if (userData.EnergyDice <= 0) {
      setModalMessage({ text: "能量骰子已耗盡，請完成定課以補充！", type: 'error' });
      return;
    }
    setIsRolling(true);
    setTimeout(() => {
      let roll = Math.floor(Math.random() * 6) + 1;
      if (userData.Role === '白龍馬') roll += 2;
      if (userData.Role === '唐三藏' && roleTrait?.isCursed) roll = Math.max(1, Math.floor(roll / 2));
      setStepsRemaining(roll);
      setIsRolling(false);
      const newEnergy = userData.EnergyDice - 1;
      setUserData({ ...userData, EnergyDice: newEnergy });
      supabase.from('CharacterStats').update({ EnergyDice: newEnergy }).eq('UserID', userData.UserID);
      setModalMessage({ text: `修行法輪轉動完成！獲得步數：${roll}`, type: 'success' });
    }, 800);
  };

  const handleMoveCharacter = async (q: number, r: number, dist: number) => {
    if (!userData) return;
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('CharacterStats').update({ CurrentQ: q, CurrentR: r }).eq('UserID', userData.UserID);
      if (error) throw error;
      setUserData({ ...userData, CurrentQ: q, CurrentR: r });
      setStepsRemaining(prev => Math.max(0, prev - dist));
      const pos = axialToPixelPos(q, r, DEFAULT_CONFIG.HEX_SIZE_WORLD);
      setCamX(pos.x); setCamY(pos.y);
    } catch (err) {
      setModalMessage({ text: "移動失敗，法陣傳送受阻。", type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleHexClick = useCallback((q: number, r: number) => {
    if (view === 'map' && stepsRemaining > 0 && userData) {
      const dist = getHexDist(userData.CurrentQ, userData.CurrentR, q, r);
      if (dist === 0) return;
      if (dist <= stepsRemaining) handleMoveCharacter(q, r, dist);
      else setModalMessage({ text: `能量不足！此步需要 ${dist} 點，目前僅餘 ${stepsRemaining}。`, type: 'error' });
    }
  }, [view, stepsRemaining, userData, handleMoveCharacter]);

  const handleCheckInAction = async (quest: Quest) => {
    if (!userData) return;
    const dailyCount = logs.filter(l => getLogicalDate(l.Timestamp) === logicalTodayStr && l.QuestID.startsWith('q')).length;
    if (dailyCount >= 3 && quest.id.startsWith('q')) {
      setModalMessage({ text: "今日修為已達 3 項定課上限。", type: 'info' });
      return;
    }
    setIsSyncing(true);
    const now = new Date();
    const roleInfo = ROLE_CURE_MAP[userData.Role];
    const isCure = roleInfo?.cureTaskId === quest.id;
    try {
      const logEntry = { Timestamp: now.toISOString(), UserID: userData.UserID, QuestID: quest.id, QuestTitle: quest.title + (isCure ? " (天命對治)" : ""), RewardPoints: quest.reward };
      await supabase.from('DailyLogs').insert([logEntry]);
      const update: Partial<CharacterStats> = { 
        Exp: userData.Exp + quest.reward, 
        Level: Math.max(1, Math.floor((userData.Exp + quest.reward) / 1000) + 1), 
        EnergyDice: userData.EnergyDice + (quest.dice || 0), 
        LastCheckIn: logicalTodayStr 
      };
      if (isCure && roleInfo) { 
        const statKey = roleInfo.bonusStat;
        (update as any)[statKey] = ((userData[statKey] as number) || 10) + 2; 
      }
      await supabase.from('CharacterStats').update(update).eq('UserID', userData.UserID);
      const { data: newLogs } = await supabase.from('DailyLogs').select('*').eq('UserID', userData.UserID);
      const updatedLogs = (newLogs as DailyLog[]) || [];
      const finalFines = await syncUserFines({ ...userData, ...update } as CharacterStats, updatedLogs);
      setLogs(updatedLogs);
      setUserData({ ...userData, ...update, TotalFines: finalFines } as CharacterStats);
      setModalMessage({ text: "修為提升，法喜充滿！", type: 'success' });
    } catch (err) { setModalMessage({ text: "記錄失敗，靈通中斷。", type: 'error' }); } finally { setIsSyncing(false); }
  };

  const handleUndoCheckInAction = async (quest: Quest | null) => {
    if (!userData || !quest) return;
    setIsSyncing(true);
    try {
      const { data: targetLogs } = await supabase.from('DailyLogs').select('*').eq('UserID', userData.UserID).eq('QuestID', quest.id).order('Timestamp', { ascending: false }).limit(1);
      if (!targetLogs || targetLogs.length === 0) return;
      if (getLogicalDate(targetLogs[0].Timestamp) !== logicalTodayStr) {
        setModalMessage({ text: "因果已定，僅限回溯今日紀錄。", type: 'info' });
        setUndoTarget(null);
        return;
      }
      await supabase.from('DailyLogs').delete().eq('id', targetLogs[0].id);
      
      const roleInfo = ROLE_CURE_MAP[userData.Role];
      const update: Partial<CharacterStats> = { 
        Exp: Math.max(0, userData.Exp - quest.reward), 
        EnergyDice: Math.max(0, userData.EnergyDice - (quest.dice || 0)) 
      };
      
      if (roleInfo?.cureTaskId === quest.id) { 
        const statKey = roleInfo.bonusStat;
        (update as any)[statKey] = Math.max(10, (userData[statKey] as number) - 2); 
      }
      
      await supabase.from('CharacterStats').update(update).eq('UserID', userData.UserID);
      const { data: newLogs } = await supabase.from('DailyLogs').select('*').eq('UserID', userData.UserID);
      const updatedLogs = (newLogs as DailyLog[]) || [];
      const finalFines = await syncUserFines({ ...userData, ...update } as CharacterStats, updatedLogs);
      setLogs(updatedLogs);
      setUserData({ ...userData, ...update, TotalFines: finalFines } as CharacterStats);
      setUndoTarget(null);
      setModalMessage({ text: "時光回溯成功，心識已歸位。", type: 'success' });
    } catch (err) { setModalMessage({ text: "回溯失敗，業力阻擋。", type: 'error' }); } finally { setIsSyncing(false); }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSyncing(true);
    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string).trim();
    const phoneSuffix = (fd.get('phone') as string).trim();
    try {
      const { data: allUsers } = await supabase.from('CharacterStats').select('*');
      const match = (allUsers as CharacterStats[])?.find(u => u.Name === name && u.UserID.endsWith(phoneSuffix));
      if (match) {
        sessionStorage.setItem('starry_session_uid', match.UserID);
        const { data: userLogs } = await supabase.from('DailyLogs').select('*').eq('UserID', match.UserID);
        const logsArray = (userLogs as DailyLog[]) || [];
        const updatedFines = await syncUserFines(match, logsArray);
        setUserData({ ...match, TotalFines: updatedFines });
        setLogs(logsArray);
        setView('app');
      } else { setModalMessage({ text: "查無此修行者印記。", type: 'error' }); }
    } catch (err) { setModalMessage({ text: "靈通感應異常。", type: 'error' }); } finally { setIsSyncing(false); }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSyncing(true);
    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string).trim();
    const phoneRaw = (fd.get('phone') as string).replace(/\D/g, '').trim();
    const phone = (phoneRaw.length === 10 && phoneRaw.startsWith('0')) ? phoneRaw.substring(1) : phoneRaw;
    const roles = Object.keys(ROLE_CURE_MAP);
    const assignedRole = roles[Math.floor(Math.random() * roles.length)];
    const newChar: CharacterStats = { UserID: phone, Name: name, Role: assignedRole, Level: 1, Exp: 0, EnergyDice: 3, Savvy: 10, Luck: 10, Charisma: 10, Spirit: 10, Physique: 10, Potential: 10, Streak: 0, LastCheckIn: null, TotalFines: 0, CurrentQ: 0, CurrentR: 0 };
    try {
      await supabase.from('CharacterStats').insert([newChar]);
      sessionStorage.setItem('starry_session_uid', newChar.UserID);
      setUserData(newChar);
      setView('app');
    } catch (err) { setModalMessage({ text: "轉生受阻。", type: 'error' }); } finally { setIsSyncing(false); }
  };

  const handleStartAdventure = async () => {
    if (!userData || userData.EnergyDice < ADVENTURE_COST) {
      setModalMessage({ text: `能量不足！啟動需要 ${ADVENTURE_COST} 顆骰子。`, type: 'error' });
      return;
    }
    setView('map'); setCamX(0); setCamY(0);
  };

  const handleLogout = () => { sessionStorage.removeItem('starry_session_uid'); setUserData(null); setView('login'); };

  // --- 相機控制處理器 ---
  const handleMapMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
  };
  const handleMapMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = dragStart.current.x - e.clientX;
    const dy = dragStart.current.y - e.clientY;
    setCamX(prev => prev + dx * 2);
    setCamY(prev => prev + dy * 2);
    dragStart.current = { x: e.clientX, y: e.clientY };
  };
  const handleMapMouseUp = () => { isDragging.current = false; };

  // --- 數據渲染準備 ---
  const worldGrid = useMemo(() => {
    const hexes: HexData[] = [];
    getHexRegion(DEFAULT_CONFIG.CENTER_SIDE - 1).forEach(p => {
      const pos = axialToPixelPos(p.q, p.r, DEFAULT_CONFIG.HEX_SIZE_WORLD);
      const key = `center_0_${p.q},${p.r}`;
      const terrainId = mapData[key] || 'grass';
      hexes.push({ ...p, ...pos, type: 'center', terrainId, color: TERRAIN_TYPES[terrainId]?.color || '#1a472a', key });
    });
    return hexes;
  }, [mapData, axialToPixelPos]);

  const visibleGrid = useMemo(() => {
    if (view !== 'map') return worldGrid;
    const margin = 1500; 
    return worldGrid.filter(h => h.x >= camX - margin && h.x <= camX + margin && h.y >= camY - margin && h.y <= camY + margin);
  }, [worldGrid, view, camX, camY]);

  const renderHexNodeInner = useCallback((hex: HexData, size: number) => {
    const isHovered = hoveredHex === hex.key;
    const isMovable = view === 'map' && stepsRemaining > 0 && userData && getHexDist(userData.CurrentQ, userData.CurrentR, hex.q, hex.r) <= stepsRemaining;

    return (
      <g key={hex.key} onMouseEnter={() => setHoveredHex(hex.key)} onMouseLeave={() => setHoveredHex(null)} onClick={() => handleHexClick(hex.q, hex.r)}>
        <polygon points={getHexPointsStr(hex.x, hex.y, size * 1.01)} fill={isMovable ? "rgba(16, 185, 129, 0.4)" : hex.color} stroke={isHovered ? "white" : "rgba(255,255,255,0.02)"} strokeWidth="1" className="cursor-pointer transition-all duration-300" />
      </g>
    );
  }, [view, hoveredHex, stepsRemaining, userData, handleHexClick]);

  // --- 初始化流程 ---
  useEffect(() => {
    const init = async () => {
      const savedUid = sessionStorage.getItem('starry_session_uid');
      if (savedUid && !userData) {
        const { data: stats, error } = await supabase.from('CharacterStats').select('*').eq('UserID', savedUid).single();
        if (stats && !error) {
          const { data: userLogs } = await supabase.from('DailyLogs').select('*').eq('UserID', stats.UserID);
          const logsArray = (userLogs as DailyLog[]) || [];
          const updatedFines = await syncUserFines(stats as CharacterStats, logsArray);
          
          const { data: settingsData } = await supabase.from('SystemSettings').select('*');
          if (settingsData) {
            const sObj = settingsData.reduce((acc: any, curr: any) => ({ ...acc, [curr.SettingName]: curr.Value }), {});
            setSystemSettings({
              MandatoryQuestId: sObj.MandatoryQuestId || 'q2',
              TopicQuestTitle: sObj.TopicQuestTitle || '修行主題載入中'
            });
          }

          setUserData({ ...stats, TotalFines: updatedFines } as CharacterStats);
          setLogs(logsArray);
          setView('app');
        } else { setView('login'); }
      } else if (!savedUid) { setView('login'); }
    };
    init();
  }, [syncUserFines, userData]);

  useEffect(() => {
    const fetchRank = async () => {
      const { data: rankData } = await supabase.from('CharacterStats').select('*').order('Exp', { ascending: false });
      if (rankData) setLeaderboard(rankData as CharacterStats[]);
    };
    if (activeTab === 'rank' || view === 'admin') fetchRank();
  }, [activeTab, view]);

  // --- 子視圖 ---

  const MapView = () => {
    const playerPixel = useMemo(() => {
      if (!userData) return { x: 0, y: 0 };
      return axialToPixelPos(userData.CurrentQ, userData.CurrentR, DEFAULT_CONFIG.HEX_SIZE_WORLD);
    }, [userData]);
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col overflow-hidden relative animate-in fade-in">
        <header className="p-6 bg-slate-900 border-b border-white/10 flex justify-between items-center z-10 text-center">
          <div className="flex items-center gap-3 text-center justify-center">
            <div className="p-3 bg-orange-600 rounded-2xl text-white shadow-lg"><MapIcon size={20} /></div>
            <div className="text-left text-white font-black text-xl italic">修行世界觀測中</div>
          </div>
          <div className="flex gap-2">
             <button onClick={handleRollDice} disabled={isRolling || stepsRemaining > 0} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all shadow-xl active:scale-95 ${stepsRemaining > 0 ? 'bg-slate-800 text-slate-500' : 'bg-orange-600 text-white hover:bg-orange-500'}`}>
               {isRolling ? <Loader2 size={16} className="animate-spin" /> : <Dice5 size={16} />} 轉法輪
             </button>
             <button onClick={() => setView('app')} className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl transition-all border border-white/10 shadow-xl active:scale-95"><ChevronLeft size={16} /> 返回修行</button>
          </div>
        </header>

        <main 
          className="flex-1 bg-black overflow-hidden relative cursor-grab active:cursor-grabbing text-center justify-center mx-auto w-full flex"
          onMouseDown={handleMapMouseDown}
          onMouseMove={handleMapMouseMove}
          onMouseUp={handleMapMouseUp}
          onMouseLeave={handleMapMouseUp}
        >
          <svg viewBox={`${camX - 800} ${camY - 800} 1600 1600`} className="w-full h-full select-none mx-auto transition-none">
            <defs><radialGradient id="mapFog"><stop offset="60%" stopColor="transparent" /><stop offset="100%" stopColor="black" stopOpacity="0.8" /></radialGradient></defs>
            <g>
              {visibleGrid.map(hex => renderHexNodeInner(hex, DEFAULT_CONFIG.HEX_SIZE_WORLD))}
              {userData && (
                <g transform={`translate(${playerPixel.x}, ${playerPixel.y})`}>
                  <circle r="12" fill="white" className="animate-pulse opacity-20" />
                  <circle r="8" fill="#ea580c" stroke="white" strokeWidth="2" />
                  <text y="5" textAnchor="middle" fontSize="12" className="select-none pointer-events-none">{ROLE_CURE_MAP[userData.Role]?.avatar || '👤'}</text>
                  <text y="22" textAnchor="middle" fontSize="8" fontWeight="bold" fill="white" className="drop-shadow-md">{userData.Name}</text>
                </g>
              )}
            </g>
            <rect x={camX - 800} y={camY - 800} width="1600" height="1600" fill="url(#mapFog)" pointerEvents="none" />
          </svg>

          <div className="absolute top-8 left-8 bg-slate-900/80 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-widest text-left">
               <Footprints size={14}/> 靈體位置：({userData?.CurrentQ}, {userData?.CurrentR})
            </div>
          </div>
        </main>
      </div>
    );
  };

  const HomeView = () => (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-40 text-center animate-in fade-in">
      <header className="p-8 bg-slate-900 border-b border-white/10 flex items-center gap-6 relative justify-center">
        <button onClick={handleLogout} className="absolute top-6 right-6 bg-slate-950/50 border border-white/5 p-2 rounded-xl text-slate-600 hover:text-red-400"><LogOut size={20} /></button>
        <div className="relative shrink-0 mx-auto text-center">
          <div className="w-24 h-24 bg-orange-600 rounded-4xl flex items-center justify-center text-white text-5xl font-black shadow-lg mx-auto">{userData?.Name?.[0]}</div>
          <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-slate-950 text-[10px] font-black px-2 py-1 rounded-full border-4 border-slate-900">LV.{userData?.Level}</div>
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-1"><h1 className="text-3xl font-black text-white">{userData?.Name}</h1><span className={`text-[10px] px-2 py-0.5 rounded font-black text-white ${userData ? ROLE_CURE_MAP[userData.Role]?.color : ''}`}>{userData ? ROLE_CURE_MAP[userData.Role]?.poison : ''}</span></div>
          <p className="text-xs text-slate-500 font-bold mb-3 uppercase tracking-widest italic">{userData?.Role} 模組修行中</p>
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-orange-500 shadow-inner" style={{ width: `${((userData?.Exp || 0) % 1000) / 10}%` }}></div></div>
        </div>
      </header>

      <nav className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-md flex p-4 gap-2 border-b border-white/5 shadow-xl overflow-x-auto no-scrollbar justify-center">
        <button onClick={() => setActiveTab('daily')} className={`shrink-0 px-6 py-4 rounded-2xl text-xs font-black transition-all ${activeTab === 'daily' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-slate-900 text-slate-500'}`}>修行定課</button>
        <button onClick={() => setActiveTab('weekly')} className={`shrink-0 px-6 py-4 rounded-2xl text-xs font-black transition-all ${activeTab === 'weekly' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-50'}`}>加分副本</button>
        <button onClick={() => setActiveTab('rank')} className={`shrink-0 px-6 py-4 rounded-2xl text-xs font-black transition-all ${activeTab === 'rank' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-50'}`}>修為榜</button>
        <button onClick={() => setActiveTab('stats')} className={`shrink-0 px-6 py-4 rounded-2xl text-xs font-black transition-all ${activeTab === 'stats' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-50'}`}>六維與罰金</button>
      </nav>

      <main className="max-w-md mx-auto p-6 space-y-8">
        {activeTab === 'daily' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500 text-center mx-auto">
            <div className="bg-red-900/20 border-2 border-red-500/40 rounded-4xl p-6 shadow-2xl text-center mx-auto">
              <div className="flex items-center gap-2 justify-center text-red-400 font-black text-xs uppercase mb-2 tracking-widest"><Flame size={16}/> 本週指定必修</div>
              <h2 className="text-2xl font-black text-white italic mx-auto">「{DAILY_QUEST_CONFIG.find(q => q.id === systemSettings.MandatoryQuestId)?.title}」</h2>
              <div className="mt-4 py-3 bg-red-600 text-white rounded-xl text-xs font-black mx-auto shadow-lg flex items-center justify-center gap-2 tracking-widest uppercase"><Coins size={14}/> 逾期罰金：NT$ {PENALTY_PER_DAY}</div>
            </div>
            {DAILY_QUEST_CONFIG.map(q => {
              const isDone = logs.some(l => l.QuestID === q.id && getLogicalDate(l.Timestamp) === logicalTodayStr);
              const questLog = logs.find(l => l.QuestID === q.id && getLogicalDate(l.Timestamp) === logicalTodayStr);
              return (
                <button key={q.id} onClick={() => !isDone ? handleCheckInAction(q) : setUndoTarget(q)} className={`relative w-full p-6 rounded-3xl border-2 flex items-center gap-4 transition-all ${isDone ? 'bg-emerald-500/10 border-emerald-500/40 opacity-70' : q.id === systemSettings.MandatoryQuestId ? 'bg-slate-900 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.2)]' : 'bg-slate-900 border-white/5'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${isDone ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-orange-500'}`}>{isDone ? '✓' : '✧'}</div>
                  <div className="flex-1 text-left"><h3 className={`font-black text-lg ${isDone ? 'text-emerald-400' : 'text-white'}`}>{q.title}</h3><p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{q.sub}</p></div>
                  <div className="font-black text-orange-500 text-right">+{q.reward}</div>
                  {isDone && questLog && <div className="absolute bottom-1 right-2 text-[8px] font-mono text-emerald-500 opacity-60">{formatCheckInTime(questLog.Timestamp)}</div>}
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'weekly' && (
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
              <button onClick={() => !isTopicDone ? handleCheckInAction({ id: 't1', title: '主題親證', reward: 1000 }) : setUndoTarget({ id: 't1', title: '主題親證', reward: 1000 })} className={`w-full py-4 rounded-2xl font-black text-lg transition-all ${isTopicDone ? 'bg-emerald-600/20 text-emerald-400 shadow-inner' : 'bg-yellow-500 text-slate-950 shadow-lg active:scale-95'}`}>{isTopicDone ? "本期已圓滿 (點擊回溯) ✓" : "回報主題修行"}</button>
            </div>
            {WEEKLY_QUEST_CONFIG.map(q => {
              const comps = logs.filter(l => l.QuestID.startsWith(q.id) && new Date(l.Timestamp) >= currentWeeklyMonday).length;
              const isMax = q.limit !== 99 && comps >= (q.limit || 0);
              return (
                <div key={q.id} className={`p-8 rounded-4xl bg-slate-900 border border-white/5 shadow-2xl ${isMax ? 'opacity-50 grayscale' : ''}`}>
                  <div className="flex items-center gap-6 mb-8 text-left text-center justify-center mx-auto">
                    <div className="text-6xl mx-auto">{q.icon}</div>
                    <div className="flex-1 text-left"><h3 className="text-2xl font-black text-white">{q.title}</h3><p className="text-sm text-slate-400 font-bold italic">{q.sub}</p></div>
                    <div className="text-sm font-black text-blue-400 bg-blue-400/10 px-3 py-1 rounded-xl">+$ {q.reward}</div>
                  </div>
                  <div className="flex justify-between items-center px-2 mx-auto">
                    {['一','二','三','四','五','六','日'].map((day, idx) => {
                      const d = new Date();
                      const currentDay = d.getDay() || 7; 
                      const diff = (idx + 1) - currentDay;
                      d.setDate(d.getDate() + diff);
                      const qId = `${q.id}|${getLogicalDate(d)}`; 
                      const isDone = logs.some(l => l.QuestID === qId);
                      return (
                        <button key={idx} title={`${day}`} onClick={() => !isDone ? (!isMax && handleCheckInAction({ ...q, id: qId })) : setUndoTarget({ ...q, id: qId })} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${isDone ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>{day}</button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'rank' && (
          <div className="bg-slate-900 border-2 border-white/5 rounded-4xl overflow-hidden divide-y divide-white/5 shadow-2xl animate-in fade-in mx-auto text-center justify-center">
             <div className="p-4 bg-slate-950/50 flex items-center gap-2 text-yellow-500 font-black text-xs uppercase tracking-widest justify-center text-center">
              <Crown size={14}/> 修為排行榜
            </div>
            {leaderboard.length === 0 ? (
               <div className="p-10 text-slate-500 italic">修行數據感應中...</div>
            ) : (
              leaderboard.map((p, i) => (
                <div key={p.UserID} className={`flex items-center gap-4 p-5 ${i < 3 ? 'bg-white/5' : ''} text-center mx-auto`}>
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-black ${
                    i === 0 ? 'bg-yellow-500 text-slate-950' : 
                    i === 1 ? 'bg-slate-300 text-slate-950' : 
                    i === 2 ? 'bg-orange-400 text-slate-950' : 
                    'text-slate-500'
                  }`}>{i + 1}</div>
                  <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center font-bold text-white shadow-md mx-auto">{p.Name?.[0]}</div>
                  <div className="flex-1 text-left"><p className="font-bold text-sm text-white">{p.Name}</p><p className="text-[10px] text-slate-500 italic uppercase tracking-widest">{p.Role}</p></div>
                  <div className="text-right text-orange-500 font-black text-sm">{p.Exp} <span className="text-[8px] text-slate-600 uppercase tracking-widest ml-1">修為</span></div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'stats' && userData && roleTrait && (
          <div className="space-y-8 animate-in zoom-in-95 duration-500 mx-auto text-center">
            <div className={`p-8 rounded-4xl border-2 shadow-2xl relative overflow-hidden transition-all ${roleTrait.isCursed ? 'bg-red-950/30 border-red-500/50' : 'bg-emerald-950/30 border-emerald-500/50'}`}>
              <div className="flex items-center justify-between mb-4 text-center">
                <div className="flex items-center gap-2">
                  {roleTrait.isCursed ? <Skull className="text-red-500" size={20}/> : <Wand2 className="text-emerald-400" size={20}/>}
                  <span className={`text-sm font-black uppercase tracking-widest ${roleTrait.isCursed ? 'text-red-400' : 'text-emerald-400'}`}>
                    {roleTrait.isCursed ? roleTrait.curseName : '天命覺醒：' + userData.Role}
                  </span>
                </div>
              </div>
              <p className="text-xs text-white leading-relaxed text-left">{roleTrait.isCursed ? roleTrait.curseEffect : roleTrait.talent}</p>
            </div>

            <div className="bg-gradient-to-br from-red-950/40 to-slate-900 border-2 border-white/5 p-8 rounded-4xl shadow-2xl text-center mx-auto">
              <span className="text-6xl font-black text-white mb-2 block">NT$ {userData.TotalFines}</span><p className="text-xs text-slate-500 font-black uppercase tracking-[0.2em]">累世罰金餘額</p>
            </div>
            <div className="grid grid-cols-1 gap-5 text-center mx-auto">
              <StatCard label="神識 (Spirit)" value={userData.Spirit} icon={<Sparkles size={16} className="text-purple-400" />} color="bg-purple-500" />
              <StatCard label="根骨 (Physique)" value={userData.Physique} icon={<Shield size={16} className="text-red-400" />} color="bg-red-500" />
              <StatCard label="魅力 (Charisma)" value={userData.Charisma} icon={<Heart size={16} className="text-pink-400" />} color="bg-pink-500" />
              <StatCard label="悟性 (Savvy)" value={userData.Savvy} icon={<Brain size={16} className="text-blue-400" />} color="bg-blue-500" />
              <StatCard label="機緣 (Luck)" value={userData.Luck} icon={<Zap size={16} className="text-emerald-400" />} color="bg-emerald-500" />
              <StatCard label="潛力 (Potential)" value={userData.Potential} icon={<Trophy size={16} className="text-yellow-400" />} color="bg-yellow-500" />
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent pointer-events-none z-30 flex justify-center text-center mx-auto">
        <button 
          disabled={(userData?.EnergyDice || 0) < ADVENTURE_COST} 
          onClick={handleStartAdventure} 
          className={`pointer-events-auto w-full max-w-md py-7 rounded-[2.5rem] font-black text-2xl shadow-xl flex items-center justify-center gap-4 transition-all mx-auto ${ (userData?.EnergyDice || 0) >= ADVENTURE_COST ? 'bg-orange-600 text-white active:scale-95 shadow-orange-600/30' : 'bg-slate-800 text-slate-600 opacity-50'}`}
        >
          <Dice5 size={32} />啟動冒險 (🎲 {userData?.EnergyDice || 0})
        </button>
      </footer>
    </div>
  );

  return (
    <div className="text-center justify-center mx-auto w-full font-sans">
      {view === 'loading' && (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-10 text-center mx-auto">
          <Loader2 className="w-16 h-16 text-orange-500 animate-spin mb-6 mx-auto" />
          <p className="text-orange-500 text-xl font-black animate-pulse text-center mx-auto">正在共感法界能量...</p>
        </div>
      )}
      {view === 'login' && (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-10 space-y-12">
          <div className="animate-in zoom-in duration-700 text-center mx-auto">
            <div className="w-32 h-32 bg-orange-600 rounded-4xl flex items-center justify-center shadow-2xl border-4 border-white/20 mb-6 mx-auto text-white text-7xl italic text-center mx-auto">🕉️</div>
            <h1 className="text-5xl font-black text-white mb-2 uppercase tracking-widest text-center mx-auto">星光西遊</h1><p className="text-orange-400 text-lg font-bold uppercase tracking-[0.4em] text-center mx-auto">修行者轉生入口</p>
          </div>
          <form onSubmit={handleLogin} className="w-full max-w-sm space-y-6 mx-auto text-center">
            <input name="name" required className="w-full bg-slate-900 border-2 border-white/5 rounded-2xl p-6 text-white text-center text-xl outline-none focus:border-orange-500 font-bold" placeholder="冒險者姓名" />
            <input name="phone" required type="password" maxLength={3} inputMode="numeric" className="w-full bg-slate-900 border-2 border-white/5 rounded-2xl p-6 text-white text-center text-xl focus:border-orange-500 font-bold" placeholder="手機末三碼" />
            <button disabled={isSyncing} className="w-full py-7 rounded-4xl bg-orange-600 text-white font-black text-2xl shadow-xl active:scale-95 transition-all text-center mx-auto">連結靈魂印記</button>
            <div className="flex flex-col gap-4">
              <button type="button" onClick={() => setView('register')} className="text-slate-500 text-sm font-bold hover:text-orange-400 transition-colors flex items-center justify-center gap-1 mx-auto mt-4"><UserPlus size={16} /> 尚未啟動轉生？</button>
              <button type="button" onClick={() => setView('admin')} className="text-slate-800 text-[10px] font-black uppercase tracking-[0.3em] hover:text-orange-900 transition-colors">大會中樞入口</button>
            </div>
          </form>
        </div>
      )}
      {view === 'register' && (
        <div className="min-h-screen bg-slate-950 p-8 text-slate-200 text-center flex flex-col items-center justify-center">
          <div className="max-w-md w-full space-y-10 animate-in slide-in-from-bottom-8 duration-500 text-center mx-auto">
            <header className="space-y-4 text-center mx-auto">
              <div className="w-20 h-20 bg-yellow-500 rounded-3xl mx-auto flex items-center justify-center shadow-xl text-slate-950 text-center mx-auto"><Sparkles size={40} /></div>
              <h1 className="text-4xl font-black text-white text-center mx-auto">啟動轉生儀式</h1>
            </header>
            <form onSubmit={handleRegister} className="space-y-8 text-center mx-auto">
              <div className="space-y-4 text-center mx-auto">
                <input name="name" required className="w-full bg-slate-900 border-2 border-white/5 rounded-2xl p-5 text-white text-center outline-none focus:border-orange-500 font-bold text-center mx-auto" placeholder="真實姓名" />
                <input name="phone" required type="tel" className="w-full bg-slate-900 border-2 border-white/5 rounded-2xl p-5 text-white text-center outline-none focus:border-orange-500 font-bold text-center mx-auto" placeholder="手機號碼 (用於唯一ID)" />
              </div>
              <button disabled={isSyncing} className="w-full py-6 rounded-4xl bg-orange-600 text-white font-black text-xl shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all text-center mx-auto">確認轉生 <ArrowRight size={24} /></button>
              <button type="button" onClick={() => setView('login')} className="text-slate-500 text-sm font-bold">返回登入</button>
            </form>
          </div>
        </div>
      )}
      {view === 'admin' && (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-8 animate-in fade-in">
          {!adminAuth ? (
            <div className="max-w-sm mx-auto mt-32 space-y-8 text-center mx-auto">
              <div className="w-20 h-20 bg-slate-800 rounded-3xl mx-auto flex items-center justify-center border border-slate-700 text-orange-500"><Lock size={40} /></div>
              <h1 className="text-3xl font-black text-white text-center mx-auto">大會中樞驗證</h1>
              <form onSubmit={handleAdminAuth} className="space-y-6">
                <input name="password" type="password" required className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl p-5 text-white text-center text-xl outline-none focus:border-orange-500 font-bold" placeholder="密令" autoFocus />
                <div className="flex gap-4">
                  <button type="button" onClick={() => setView('login')} className="flex-1 py-4 bg-slate-800 text-slate-400 font-bold rounded-2xl">取消</button>
                  <button className="flex-2 py-4 bg-orange-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all">驗證登入</button>
                </div>
              </form>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto space-y-12 pb-20">
              <header className="flex justify-between items-center text-center mx-auto">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-600 rounded-2xl text-white shadow-lg"><Settings size={24} /></div>
                  <h1 className="text-3xl font-black text-white text-center mx-auto">大會管理後台</h1>
                </div>
                <button onClick={() => setView('login')} className="p-3 bg-slate-900 rounded-2xl text-slate-500 border border-slate-800 hover:text-red-400"><X size={20} /></button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="space-y-6">
                  <div className="flex items-center gap-2 text-orange-500 font-black text-sm uppercase tracking-widest"><BarChart3 size={16} /> 全域修行設定</div>
                  <div className="bg-slate-900 border-2 border-slate-800 p-8 rounded-4xl space-y-8 shadow-xl">
                    <div className="space-y-4">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest">本週指定必修項目</label>
                      <select value={systemSettings.MandatoryQuestId} onChange={(e) => updateGlobalSetting('MandatoryQuestId', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500 cursor-pointer text-center">
                        {DAILY_QUEST_CONFIG.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
                      </select>
                    </div>
                    <div className="space-y-4">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest">雙週加分主題名稱</label>
                      <div className="flex gap-2 text-center mx-auto">
                        <input defaultValue={systemSettings.TopicQuestTitle} onBlur={(e) => updateGlobalSetting('TopicQuestTitle', e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-orange-500 text-center" />
                        <button className="bg-orange-600 p-4 rounded-2xl text-white font-black"><Save size={20} /></button>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="flex items-center gap-2 text-orange-500 font-black text-sm uppercase tracking-widest"><Users size={16} /> 修行者修為榜預覽</div>
                  <div className="bg-slate-900 border-2 border-slate-800 rounded-4xl overflow-hidden divide-y divide-slate-800 shadow-xl max-h-[400px] overflow-y-auto">
                    {leaderboard.map((p, i) => (
                      <div key={p.UserID} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                        <span className="text-xs font-black text-slate-600 w-4 text-center">{i+1}</span>
                        <div className="flex-1">
                          <p className="font-bold text-white text-sm">{p.Name}</p>
                          <p className="text-[10px] text-slate-500 italic">{p.Role}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-orange-500">{p.Exp} 修為</p>
                          <p className="text-[10px] text-red-500">罰金 NT${p.TotalFines}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      )}
      {view === 'app' && <HomeView />}
      {view === 'map' && <MapView />}
      
      {undoTarget && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-200 text-center mx-auto">
          <div className="bg-slate-900 border-2 border-slate-800 p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center space-y-6 mx-auto">
            <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-orange-500/20 text-orange-500 mx-auto text-center"><RotateCcw size={40} className="animate-spin-slow" /></div>
            <h3 className="text-2xl font-black text-white text-center mx-auto">發動時光回溯？</h3><p className="text-slate-400 text-sm font-bold text-center mx-auto">這將會扣除本次修得的 {undoTarget.reward} 修為。</p>
            <div className="flex gap-4 text-center mx-auto"><button onClick={() => setUndoTarget(null)} className="flex-1 py-4 bg-slate-800 text-slate-500 font-black rounded-2xl text-center shadow-lg transition-all active:scale-95">保持現狀</button><button onClick={() => handleUndoCheckInAction(undoTarget)} className="flex-1 py-4 bg-orange-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all text-center mx-auto">確認回溯</button></div>
          </div>
        </div>
      )}

      {isSyncing && (
        <div className="fixed inset-0 bg-slate-950/60 z-[1100] flex flex-col items-center justify-center text-center mx-auto">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4 mx-auto" />
          <p className="text-orange-500 font-black animate-pulse tracking-widest uppercase text-center mx-auto">與法界同步中...</p>
        </div>
      )}

      {modalMessage && <MessageBox message={modalMessage.text} type={modalMessage.type} onClose={() => setModalMessage(null)} />}
    </div>
  );
}