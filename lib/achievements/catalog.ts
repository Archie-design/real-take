// ============================================================
// 成就圖鑑 — 61 筆靜態 catalog（source of truth）
// 對應 reference/親證班成就系統.xlsx，圖檔在 /public/achievements/{id}.png
// ============================================================

export type Rarity = 'common' | 'rare' | 'super_rare' | 'legendary';

export type PredicateKind =
    | 'quest_count_total'      // 特定 QuestID 累計次數 ≥ min
    | 'quest_first'            // 首次完成任一指定 quest
    | 'quest_same_day'         // 同一邏輯日不同 quest 數 ≥ min
    | 'quest_distinct_days'    // 特定 quest 出現過的不同邏輯日數 ≥ min
    | 'streak_any_quest'       // 連續 N 天每天 ≥1 個定課
    | 'streak_specific_quest'  // 特定 quest 連續 N 天
    | 'exp_min'                // 累計分數 ≥ min
    | 'level_min'              // Level ≥ min
    | 'bonus_approved';        // 特定 bonus quest_id 核准次數 ≥ min

export interface AchievementDef {
    id: number;                // 1–61，對應 PNG 檔名
    rarity: Rarity;
    hint: string;              // 引言
    description: string;       // 解鎖條件（人類可讀）
    predicate: {
        kind: PredicateKind;
        quest_ids?: string[];
        min?: number;
        min_distinct?: number;
    };
}

// 感恩類定課 = q2(每日五感恩) + q6(感恩冥想) + q8(餐前感恩)
const GRATITUDE = ['q2', 'q6', 'q8'];
// 打拳定課 = q1 + q1_dawn
const PUNCH = ['q1', 'q1_dawn'];
// 任一定課 (用於「首次完成定課」成就)
const ANY_DAILY_QUEST = [
    'q1', 'q1_dawn',
    'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11',
    'q12', 'q13', 'q14', 'q15', 'q16', 'q17', 'q18', 'q19', 'q20', 'q21', 'q22',
    'r1',
];

export const ACHIEVEMENT_CATALOG: AchievementDef[] = [
    // ── 常見 (1–18) ──────────────────────────────────────────
    { id: 1,  rarity: 'common', hint: '每個傳奇，都從一次看似微不足道的開始。', description: '完成了人生第一個定課',
        predicate: { kind: 'quest_first', quest_ids: ANY_DAILY_QUEST } },
    { id: 2,  rarity: 'common', hint: '當你開始掌控一天，你就開始掌控命運。', description: '在同一邏輯日完成 3 個定課',
        predicate: { kind: 'quest_same_day', min_distinct: 3 } },
    { id: 3,  rarity: 'common', hint: '力量，不來自爆發，而來自你沒有停下來的那三天。', description: '連續 3 天完成打拳定課',
        predicate: { kind: 'streak_specific_quest', quest_ids: PUNCH, min: 3 } },
    { id: 4,  rarity: 'common', hint: '真正的連結，是一次次願意靠近的選擇。', description: '連續 3 天完成關係定課',
        predicate: { kind: 'streak_specific_quest', quest_ids: ['r1'], min: 3 } },
    { id: 5,  rarity: 'common', hint: '你跨出的，不只是一步，是一道心牆。', description: '首次完成關係定課',
        predicate: { kind: 'quest_first', quest_ids: ['r1'] } },
    { id: 6,  rarity: 'common', hint: '看見自己，是最難，也最偉大的冒險。', description: '累計觀心書 7 次',
        predicate: { kind: 'quest_count_total', quest_ids: ['q3'], min: 7 } },
    { id: 7,  rarity: 'common', hint: '當你開始感恩，世界就開始回應你。', description: '累計感恩類定課 7 次',
        predicate: { kind: 'quest_count_total', quest_ids: GRATITUDE, min: 7 } },
    { id: 8,  rarity: 'common', hint: '你不再只是參與者，你開始成為玩家。', description: '等級達到 5 級',
        predicate: { kind: 'level_min', min: 5 } },
    { id: 9,  rarity: 'common', hint: '英雄從不獨行，他們會找到彼此。', description: '首次參與小隊定聚',
        predicate: { kind: 'quest_first', quest_ids: ['w3'] } },
    { id: 10, rarity: 'common', hint: '聲音，是靈魂與靈魂之間最短的距離。', description: '首次參與小隊通話',
        predicate: { kind: 'quest_first', quest_ids: ['w4'] } },
    { id: 11, rarity: 'common', hint: '說出你的故事，就是點亮別人的光。', description: '首次完成親證分享',
        predicate: { kind: 'quest_first', quest_ids: ['w1'] } },
    { id: 12, rarity: 'common', hint: '當你願意傾聽，你已經在拯救世界。', description: '首次完成天使通話',
        predicate: { kind: 'quest_first', quest_ids: ['a1'] } },
    { id: 13, rarity: 'common', hint: '這不是分數，這是你走過的證明。', description: '累計分數達到 1 萬分',
        predicate: { kind: 'exp_min', min: 10000 } },
    { id: 14, rarity: 'common', hint: '在世界醒來之前，你已經贏了一次。', description: '首次完成破曉打拳',
        predicate: { kind: 'quest_first', quest_ids: ['q1_dawn'] } },
    { id: 15, rarity: 'common', hint: '沒有計畫的夢想，只是願望。', description: '完成個人主題任務：規劃行事曆（沉澱週功夫熊貓）',
        predicate: { kind: 'quest_first', quest_ids: ['t3_forrest'] } },
    { id: 16, rarity: 'common', hint: '紀律，是你對未來的承諾。', description: '累計子時入睡 7 次',
        predicate: { kind: 'quest_count_total', quest_ids: ['q12'], min: 7 } },
    { id: 17, rarity: 'common', hint: '當你全然活在當下，時間都為你停下。', description: '累計當下之舞或熱舞定課 7 次',
        predicate: { kind: 'quest_count_total', quest_ids: ['q14', 'q20'], min: 7 } },
    { id: 18, rarity: 'common', hint: '笑，是最被低估的超能力。', description: '累計大笑功法 7 次',
        predicate: { kind: 'quest_count_total', quest_ids: ['q13'], min: 7 } },

    // ── 稀有 (19–31) ─────────────────────────────────────────
    { id: 19, rarity: 'rare', hint: '你開始與自己的節奏對齊。', description: '累計子時入睡 21 次',
        predicate: { kind: 'quest_count_total', quest_ids: ['q12'], min: 21 } },
    { id: 20, rarity: 'rare', hint: '你正在選擇，更乾淨的力量。', description: '累計一日一蔬食 21 次',
        predicate: { kind: 'quest_count_total', quest_ids: ['q16'], min: 21 } },
    { id: 21, rarity: 'rare', hint: '你不再只是感謝，而是成為祝福。', description: '累計感恩類定課 21 次',
        predicate: { kind: 'quest_count_total', quest_ids: GRATITUDE, min: 21 } },
    { id: 22, rarity: 'rare', hint: '日出之前，是意志最誠實的時刻。', description: '累計破曉打拳 7 次',
        predicate: { kind: 'quest_count_total', quest_ids: ['q1_dawn'], min: 7 } },
    { id: 23, rarity: 'rare', hint: '你已經不是在努力，你是在蛻變。', description: '累計分數達到 8 萬分',
        predicate: { kind: 'exp_min', min: 80000 } },
    { id: 24, rarity: 'rare', hint: '你證明了——你做得到，而且會繼續。', description: '連續 7 天各完成至少一個定課',
        predicate: { kind: 'streak_any_quest', min: 7 } },
    { id: 25, rarity: 'rare', hint: '你開始被世界認真對待。', description: '等級達到 20 級',
        predicate: { kind: 'level_min', min: 20 } },
    { id: 26, rarity: 'rare', hint: '你已經成為別人黑暗中的光。', description: '累計天使通話 7 次',
        predicate: { kind: 'quest_count_total', quest_ids: ['a1'], min: 7 } },
    { id: 27, rarity: 'rare', hint: '你的身體，記住了你的決心。', description: '累計完成打拳定課 21 次',
        predicate: { kind: 'quest_count_total', quest_ids: PUNCH, min: 21 } },
    { id: 28, rarity: 'rare', hint: '你正在重寫與世界的連結方式。', description: '累計完成關係定課 21 次',
        predicate: { kind: 'quest_count_total', quest_ids: ['r1'], min: 21 } },
    { id: 29, rarity: 'rare', hint: '真正的強者，願意被看見與檢視。', description: '完成個人主題任務：回報道命上級（沉澱週腦筋急轉彎）',
        predicate: { kind: 'quest_first', quest_ids: ['t3_inside'] } },
    { id: 30, rarity: 'rare', hint: '你不再逃避，你開始理解自己。', description: '累計觀心書 21 次',
        predicate: { kind: 'quest_count_total', quest_ids: ['q3'], min: 21 } },
    { id: 31, rarity: 'rare', hint: '你的真實，開始有重量。', description: '累計個人主題任務親證 7 次',
        predicate: { kind: 'quest_count_total', quest_ids: ['t2'], min: 7 } },

    // ── 超稀有 (32–50) ───────────────────────────────────────
    { id: 32, rarity: 'super_rare', hint: '你的生命，開始成為他人的答案。', description: '累計個人主題任務親證 21 次',
        predicate: { kind: 'quest_count_total', quest_ids: ['t2'], min: 21 } },
    { id: 33, rarity: 'super_rare', hint: '不是神燈改變命運，是你敢許願。', description: '完成小組定聚主題 — 功夫熊貓',
        predicate: { kind: 'bonus_approved', quest_ids: ['sq1'], min: 1 } },
    { id: 34, rarity: 'super_rare', hint: '面對黑暗的那一刻，你就是光。', description: '完成小組定聚主題 — 獵魔女團',
        predicate: { kind: 'bonus_approved', quest_ids: ['sq3'], min: 1 } },
    { id: 35, rarity: 'super_rare', hint: '速度，不是為了贏別人，而是突破極限。', description: '完成小組定聚主題 — 真愛每一天',
        predicate: { kind: 'bonus_approved', quest_ids: ['sq2'], min: 1 } },
    { id: 36, rarity: 'super_rare', hint: '當你站上場，你就是信念本身。', description: '完成小組定聚主題 — 天外奇蹟',
        predicate: { kind: 'bonus_approved', quest_ids: ['sq4'], min: 1 } },
    { id: 37, rarity: 'super_rare', hint: '你開始看見更深層的自己。', description: '累計觀心書 30 次',
        predicate: { kind: 'quest_count_total', quest_ids: ['q3'], min: 30 } },
    { id: 38, rarity: 'super_rare', hint: '關係，不再是課題，而是修行。', description: '累計完成關係定課 30 天',
        predicate: { kind: 'quest_distinct_days', quest_ids: ['r1'], min: 30 } },
    { id: 39, rarity: 'super_rare', hint: '這不是習慣，是身份轉變。', description: '連續 21 天各完成至少一個定課',
        predicate: { kind: 'streak_any_quest', min: 21 } },
    { id: 40, rarity: 'super_rare', hint: '你已進入高手的世界。', description: '等級達到 50 級',
        predicate: { kind: 'level_min', min: 50 } },
    { id: 41, rarity: 'super_rare', hint: '你已經有了戰友，而不是同伴。', description: '參與 4 次小隊定聚',
        predicate: { kind: 'quest_count_total', quest_ids: ['w3'], min: 4 } },
    { id: 42, rarity: 'super_rare', hint: '你選擇走進現實，而不是停在想像。', description: '參與 3 次實體課程',
        predicate: { kind: 'bonus_approved', quest_ids: ['b7'], min: 3 } },
    { id: 43, rarity: 'super_rare', hint: '世界因你，多了一道光。', description: '成功傳愛 1 人（完款）',
        predicate: { kind: 'bonus_approved', quest_ids: ['b2'], min: 1 } },
    { id: 44, rarity: 'super_rare', hint: '你的聲音，開始有影響力。', description: '累計 10 次親證分享',
        predicate: { kind: 'quest_count_total', quest_ids: ['w1'], min: 10 } },
    { id: 45, rarity: 'super_rare', hint: '你已成為橋樑，而不只是過客。', description: '累計天使通話 10 次',
        predicate: { kind: 'quest_count_total', quest_ids: ['a1'], min: 10 } },
    { id: 46, rarity: 'super_rare', hint: '這，是一段英雄旅程的里程碑。', description: '累計分數達到 10 萬分',
        predicate: { kind: 'exp_min', min: 100000 } },
    { id: 47, rarity: 'super_rare', hint: '你不只是早起，你是在主宰清晨。', description: '累計破曉打拳 14 次',
        predicate: { kind: 'quest_count_total', quest_ids: ['q1_dawn'], min: 14 } },
    { id: 48, rarity: 'super_rare', hint: '夢想，不是實現，是被打磨出來的。', description: '完成個人主題任務：圓夢計畫解盤/復盤',
        predicate: { kind: 'bonus_approved', quest_ids: ['b9'], min: 1 } },
    { id: 49, rarity: 'super_rare', hint: '真正的修行，在世界之中。', description: '參與拍攝大隊挑戰任務 — 道在江湖',
        predicate: { kind: 'bonus_approved', quest_ids: ['doc1_member'], min: 1 } },
    { id: 50, rarity: 'super_rare', hint: '你與太陽，已經成為夥伴。', description: '累計破曉打拳 30 次',
        predicate: { kind: 'quest_count_total', quest_ids: ['q1_dawn'], min: 30 } },

    // ── 傳說級 (51–61) ───────────────────────────────────────
    { id: 51, rarity: 'legendary', hint: '你不是早起的人，你是晨光的一部分。', description: '累計破曉打拳 60 次',
        predicate: { kind: 'quest_count_total', quest_ids: ['q1_dawn'], min: 60 } },
    { id: 52, rarity: 'legendary', hint: '你的心，開始穩如山。', description: '累積抄經 60 次',
        predicate: { kind: 'quest_count_total', quest_ids: ['q19'], min: 60 } },
    { id: 53, rarity: 'legendary', hint: '你的選擇，正在改變你的本質。', description: '累積一日一蔬食 60 次',
        predicate: { kind: 'quest_count_total', quest_ids: ['q16'], min: 60 } },
    { id: 54, rarity: 'legendary', hint: '你已經活成一種關係的力量。', description: '累計完成關係定課 60 天',
        predicate: { kind: 'quest_distinct_days', quest_ids: ['r1'], min: 60 } },
    { id: 55, rarity: 'legendary', hint: '不是世界變了，是你進化了。', description: '完成個人主題任務：適應力挑戰的解盤',
        predicate: { kind: 'bonus_approved', quest_ids: ['b10'], min: 1 } },
    { id: 56, rarity: 'legendary', hint: '你已經接近傳奇。', description: '等級達到 80 級',
        predicate: { kind: 'level_min', min: 80 } },
    { id: 57, rarity: 'legendary', hint: '你不再尋找光，你就是光。', description: '成為心之使者',
        predicate: { kind: 'bonus_approved', quest_ids: ['b4'], min: 1 } },
    { id: 58, rarity: 'legendary', hint: '光，開始透過你擴散。', description: '成功傳愛 3 人（完款）',
        predicate: { kind: 'bonus_approved', quest_ids: ['b2'], min: 3 } },
    { id: 59, rarity: 'legendary', hint: '你改變的，不只是對話，是人生。', description: '累計天使通話 20 次',
        predicate: { kind: 'quest_count_total', quest_ids: ['a1'], min: 20 } },
    { id: 60, rarity: 'legendary', hint: '這不是終點，這是新篇章的開始。', description: '累計分數達到 50 萬分',
        predicate: { kind: 'exp_min', min: 500000 } },
    { id: 61, rarity: 'legendary', hint: '你證明了一件事——你說到做到。', description: '連續 60 天各完成至少一個定課',
        predicate: { kind: 'streak_any_quest', min: 60 } },
];

export const ACHIEVEMENT_MAP = new Map(ACHIEVEMENT_CATALOG.map(a => [a.id, a]));

export const RARITY_META: Record<Rarity, { label: string; border: string; text: string; glow: string; bg: string; order: number }> = {
    common:       { label: '常見',   border: 'border-slate-400',  text: 'text-slate-300', glow: 'shadow-slate-400/30',  bg: 'bg-slate-700/30',  order: 0 },
    rare:         { label: '稀有',   border: 'border-sky-400',    text: 'text-sky-300',   glow: 'shadow-sky-400/40',    bg: 'bg-sky-900/30',    order: 1 },
    super_rare:   { label: '超稀有', border: 'border-purple-400', text: 'text-purple-300', glow: 'shadow-purple-400/50', bg: 'bg-purple-900/30', order: 2 },
    legendary:    { label: '傳說級', border: 'border-amber-400', text: 'text-amber-300', glow: 'shadow-amber-400/60',  bg: 'bg-amber-900/30',  order: 3 },
};

export const RARITY_COUNTS = {
    common: ACHIEVEMENT_CATALOG.filter(a => a.rarity === 'common').length,
    rare: ACHIEVEMENT_CATALOG.filter(a => a.rarity === 'rare').length,
    super_rare: ACHIEVEMENT_CATALOG.filter(a => a.rarity === 'super_rare').length,
    legendary: ACHIEVEMENT_CATALOG.filter(a => a.rarity === 'legendary').length,
    total: ACHIEVEMENT_CATALOG.length,
};
