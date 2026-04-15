import {
    EyeOff, Flame, Droplets, Wind, Ghost, Heart,
    ThumbsUp, BookOpen, Brain, Sparkles, Star, Utensils,
    HeartHandshake, TreePine, Waves, Moon, Laugh, Music2, Sun,
    Salad, MicVocal, Target, PenLine, Music, Flower2, Bell,
    Phone, Mic, Award, Users, PhoneCall,
    WandSparkles, Zap, Eye, Drum, Swords,
    type LucideIcon,
} from 'lucide-react';
import { Quest, ZoneInfo } from '@/types';

export const BASE_START_DATE_STR = "2026-02-01";
export const END_DATE = "2026-07-15";
export const PENALTY_PER_DAY = 50;

/**
 * 門檻公式：9000 + (Level - 1) * 100
 */
const BASE_REQ = 9000;
const INCREMENT = 100;

export function getAccumulatedExpForLevel(level: number): number {
    if (level <= 1) return 0;
    const n = level - 1;
    // 等差級數和公式: n/2 * (2*a + (n-1)*d)
    return Math.floor((n / 2) * (2 * BASE_REQ + (n - 1) * INCREMENT));
}

export function getExpForNextLevel(level: number): number {
    if (level >= 99) return 0;
    return BASE_REQ + (level - 1) * INCREMENT;
}

export function calculateLevelFromExp(exp: number): number {
    let currentLevel = 1;
    while (currentLevel < 99) {
        // 如果票房足夠達到下一級的門檻，就升級
        if (exp >= getAccumulatedExpForLevel(currentLevel + 1)) {
            currentLevel++;
        } else {
            break;
        }
    }
    return currentLevel;
}

export const ADMIN_PASSWORD = "123";

export const ZONES: ZoneInfo[] = [
    { id: 'pride', name: '愛情片．甜蜜陷阱', char: '偶像明星', color: '#f8fafc', textColor: 'text-pink-400', icon: <Heart size={14} /> },
    { id: 'doubt', name: '劇情片．反轉迷宮', char: '文藝名導', color: '#1e3a8a', textColor: 'text-blue-400', icon: <EyeOff size={14} /> },
    { id: 'anger', name: '動作片．爆破前線', char: '動作巨星', color: '#991b1b', textColor: 'text-red-500', icon: <Flame size={14} /> },
    { id: 'greed', name: '喜劇片．歡笑泥沼', char: '喜劇泰斗', color: '#14532d', textColor: 'text-emerald-500', icon: <Droplets size={14} /> },
    { id: 'delusion', name: '科幻片．綠幕幻境', char: '特效大師', color: '#78350f', textColor: 'text-orange-500', icon: <Wind size={14} /> },
    { id: 'chaos', name: '爛片．票房毒藥', char: 'Boss', color: '#1e293b', textColor: 'text-slate-400', icon: <Ghost size={14} /> },
];


// ── 每日定課 ──────────────────────────────────────────────────────────────
// 規則：
//   體運定課  q1(+1000) / q1_dawn(+2000) 每日擇一，互斥
//   任意定課  q2–q22 各 +1000，每日共用上限 3 種（每種各最多 1 次）
//   關係定課  r1 +2000／人，每日最多 3 名（見 quest.ts 特別處理）
export const DAILY_QUEST_CONFIG: Quest[] = [
    { id: 'q1',  title: '體運定課',    sub: '打拳或運動 30 分鐘', reward: 1000 },
    { id: 'q2',  title: '每日五感恩',  icon: '🙏', reward: 1000 },
    { id: 'q3',  title: '觀心書',      icon: '📖', reward: 1000 },
    { id: 'q4',  title: '靜心冥想',    icon: '🧘', reward: 1000 },
    { id: 'q5',  title: '自我肯定',    icon: '✨', reward: 1000 },
    { id: 'q6',  title: '感恩冥想',    icon: '💛', reward: 1000 },
    { id: 'q7',  title: '創造法則冥想',icon: '🌟', reward: 1000 },
    { id: 'q8',  title: '餐前感恩',    icon: '🍽️', reward: 1000 },
    { id: 'q9',  title: '欣賞伴侶',    icon: '💑', reward: 1000 },
    { id: 'q10', title: '接地氣',      icon: '🌿', reward: 1000 },
    { id: 'q11', title: '接海氣',      icon: '🌊', reward: 1000 },
    { id: 'q12', title: '子時入睡',    icon: '🌙', reward: 1000 },
    { id: 'q13', title: '大笑功法',    icon: '😄', reward: 1000 },
    { id: 'q14', title: '熱舞',        icon: '💃', reward: 1000 },
    { id: 'q15', title: '光的冥想',    icon: '☀️', reward: 1000 },
    { id: 'q16', title: '一日一蔬食',  icon: '🥦', reward: 1000 },
    { id: 'q17', title: '大悲咒',      icon: '🕉️', reward: 1000 },
    { id: 'q18', title: '活在當下',    icon: '🎯', reward: 1000 },
    { id: 'q19', title: '抄心經',      icon: '📝', reward: 1000 },
    { id: 'q20', title: '當下之舞',    icon: '🎶', reward: 1000 },
    { id: 'q21', title: '祝福',        icon: '🌸', reward: 1000 },
    { id: 'q22', title: '嗯啊吽',      icon: '🔔', reward: 1000 },
    { id: 'r1',  title: '關係定課',    sub: '與三貴人或伴侶有品質互動（≥15分鐘）', reward: 2000 },
];

// 任意定課 ID 集合，供伺服器端驗證與前端篩選共用
export const FLEX_QUEST_IDS = new Set([
    'q2','q3','q4','q5','q6','q7','q8','q9','q10','q11',
    'q12','q13','q14','q15','q16','q17','q18','q19','q20','q21','q22',
]);

// ── 每週 / 雙週 / 月任務 ──────────────────────────────────────────────────
// a1：天使通話      +500／次，每週至少1次、不設上限
// w1：親證分享      +1000，每週最多1則
// w2：欣賞／肯定夥伴 +1000，每週最多1則
// w3：小隊定聚      +5000，每月最多2次
// w4：小隊通話      +3000，每月最多2次
export const WEEKLY_QUEST_CONFIG: Quest[] = [
    { id: 'a1', title: '主創對談',       sub: '分享本週拍攝進度（每週至少 1 次）', reward: 500,  icon: '👼' },
    { id: 'w1', title: '精彩片段分享',   sub: '群組分享上週花絮 & 下週劇本規劃',  reward: 1000, limit: 1, icon: '🎙️' },
    { id: 'w2', title: '讚賞合製夥伴',   sub: '每週 1 則',                      reward: 1000, limit: 1, icon: '🌟' },
    { id: 'w3', title: '劇組首映會',     sub: '小隊專屬首映（每月最多 2 次）',   reward: 5000, limit: 2, icon: '🎪' },
    { id: 'w4', title: '劇組會議',       sub: '分享拍攝心得，給予劇組支持（每月最多 2 次）', reward: 3000, limit: 2, icon: '📞' },
];

// ── 小隊主題定聚任務（搭配 w3 使用）────────────────────────────────────────
// 除 w3 基礎 +5000 外，另加主題分數；全員到齊再加成
export const SQUAD_THEME_CONFIG = [
    { id: 'sq1', title: '功夫熊貓',   attr: '陰／適應力',           reward: 3000, bonusFull: 2000, icon: '🐼', desc: '帶領夥伴一起參與戶外活動遊玩，練習適應力' },
    { id: 'sq2', title: '真愛每一天', attr: '陰／父母婚姻的啟蒙',   reward: 3000, bonusFull: 2000, icon: '❤️', desc: '小隊長帶領小隊員一起寫對父母婚姻中的啟蒙（心態、行動，可以是卡片或日記）' },
    { id: 'sq3', title: '獵魔女團',   attr: '陰／同質異質',         reward: 3000, bonusFull: 2000, icon: '🔮', desc: '與小隊哥一起探尋自己這週排行在後的弱點，並藉此成長自己' },
    { id: 'sq4', title: '天外奇蹟',   attr: '陽／無條件付出',       reward: 3000, bonusFull: 2000, icon: '🎈', desc: 'EX. 去陪伴老人家、做義工等無條件付出的行動' },
];

// ── Quest Icon Map（ID → Lucide Component）─────────────────────────────────
export const QUEST_ICON_MAP: Record<string, LucideIcon> = {
    q2:  ThumbsUp,       // 每日五感恩
    q3:  BookOpen,       // 觀心書
    q4:  Brain,          // 靜心冥想
    q5:  Sparkles,       // 自我肯定
    q6:  Heart,          // 感恩冥想
    q7:  Star,           // 創造法則冥想
    q8:  Utensils,       // 餐前感恩
    q9:  HeartHandshake, // 欣賞伴侶
    q10: TreePine,       // 接地氣
    q11: Waves,          // 接海氣
    q12: Moon,           // 子時入睡
    q13: Laugh,          // 大笑功法
    q14: Music2,         // 熱舞
    q15: Sun,            // 光的冥想
    q16: Salad,          // 一日一蔬食
    q17: MicVocal,       // 大悲咒
    q18: Target,         // 活在當下
    q19: PenLine,        // 抄心經
    q20: Music,          // 當下之舞
    q21: Flower2,        // 祝福
    q22: Bell,           // 嗯啊吽
    // Weekly quests
    a1:  Phone,          // 天使通話
    w1:  Mic,            // 親證分享
    w2:  Award,          // 欣賞／肯定夥伴
    w3:  Users,          // 小隊定聚
    w4:  PhoneCall,      // 小隊通話
};

// ── Squad Theme Icon Map（ID → Lucide Component）───────────────────────────
export const SQUAD_THEME_ICON_MAP: Record<string, LucideIcon> = {
    sq1: Swords,          // 功夫熊貓
    sq2: Heart,           // 真愛每一天
    sq3: Eye,             // 獵魔女團
    sq4: HeartHandshake,  // 天外奇蹟
};

export const SQUAD_ROLES = ['副隊長', '抱抱', '衡衡', '叮叮1號', '叮叮2號', '樂樂'] as const;
