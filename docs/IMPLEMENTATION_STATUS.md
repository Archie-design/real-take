# 開發規格書 vs 實際程式碼 — 完成度比對報告

**比對日期：2026-04-03**
**規格來源：`docs/GAME_DESIGN.md` v2.1**

---

## 一、已完成項目 (Implemented)

### 1. 定課任務系統 (Quest System) — 完成度：95%

| 規格項目 | 狀態 | 實作位置 |
|---------|------|---------|
| q1 體運定課 (+1000) | ✅ | `components/Tabs/DailyQuestsTab.tsx` |
| q1_dawn 破曉體運 (+2000, 05:00-08:00) | ✅ | 與 q1 互斥邏輯已實作 |
| q2-q22 任意定課 (每日最多3種) | ✅ | 21 項全部實作，含每日上限檢查 |
| r1 關係定課 (+2000/人, 最多3人) | ✅ | 含6種關係類型下拉選單 |
| a1 天使通話 (+500, 週1-3次) | ✅ | `components/Tabs/WeeklyTopicTab.tsx` |
| w1 親證分享 (+1000, 週最多1則) | ✅ | 含 Testimony 系統整合 |
| w2 欣賞夥伴 (+1000, 週最多3則) | ✅ | 不同人檢查 |
| w3 小隊定聚 (+5000, 月最多2次) | ✅ | 含罰款連動 |
| w4 小隊通話 (+3000, 月最多2次) | ✅ | |
| sq1-sq4 小隊主題定聚 (+3000 + 全員+2000) | ✅ | 四個主題皆有 |
| t1 個人主題（計劃/解盤完成 +1000） | ✅ | 依電影階段解鎖 |
| t2 個人主題（每日親證 +500） | ✅ | t1 完成後才能打卡 |
| t3 沉澱週分享 (+600/則, 最多3則) | ✅ | 僅沉澱週可用 |
| b3-b7 額外加分 | ✅ | `app/actions/bonus.ts` 含審核流程 |

### 2. 組織架構 — 完成度：85%

| 規格項目 | 狀態 | 實作位置 |
|---------|------|---------|
| 大隊→小隊→學員 三層架構 | ✅ | `CharacterStats`: SquadName(大隊) + TeamName(小隊) |
| 權限層級（學員/小隊長/大隊長/管理者） | ✅ | boolean flags: IsCaptain / IsCommandant / IsGM |
| 7種小隊角色職稱 | ✅ | `setSquadRole()` in `app/actions/team.ts` |
| CSV 批次匯入名冊 | ✅ | `importRostersData()` in `app/actions/admin.ts` |

### 3. 計分與排行榜 — 完成度：100%

| 規格項目 | 狀態 | 實作位置 |
|---------|------|---------|
| 個人分數累積 | ✅ | `CharacterStats.Exp` |
| 小隊分數 = 總分 ÷ 人數（平均制） | ✅ | `components/Tabs/RankTab.tsx` |
| 個人榜（頭像/姓名/分數/Streak） | ✅ | |
| 小隊榜（隊名/隊長/平均分/人數） | ✅ | |
| Streak 連續打卡追蹤 | ✅ | `CharacterStats.Streak` |

### 4. 管理後台 — 完成度：80%

| 規格項目 | 狀態 | 實作位置 |
|---------|------|---------|
| 特殊加分副本（臨時任務） | ✅ | TemporaryQuests CRUD |
| 全服天使通話抽籤 | ✅ | `runAngelCallPairing()` in `app/actions/admin.ts` |
| 傳愛審核（學員→小隊長→大隊長） | ✅ | `app/actions/bonus.ts` 三層審核 |
| 管理日誌 (AdminActivityLog) | ✅ | 完整記錄所有管理操作 |
| 成員名冊管理 | ✅ | CSV 匯入 |
| 罰款系統 | ✅ | `app/actions/fines.ts` |

### 5. 活動時間軸 — 完成度：100%

| 規格項目 | 狀態 | 實作位置 |
|---------|------|---------|
| 第1-4週 阿甘正傳 (5/4-5/31) | ✅ | `getCurrentThemePeriod()` in `lib/utils/time.ts` |
| 沉澱週 功夫熊貓 (6/1-6/7) | ✅ | |
| 第5-8週 哈利波特 (6/8-7/5) | ✅ | |
| 沉澱週 腦筋急轉彎 (7/6-7/12) | ✅ | |
| 前後期狀態判斷 | ✅ | before / after 狀態 |

### 6. LINE 整合 — 完成度：100%

| 規格項目 | 狀態 | 實作位置 |
|---------|------|---------|
| LINE Bot Webhook | ✅ | `app/api/webhook/line/route.ts` |
| LINE Login OAuth | ✅ | `app/api/auth/line/route.ts` + callback |
| Rich Menu 設定 | ✅ | `app/api/admin/setup-richmenu/route.tsx` |
| 親證故事解析→圖卡→Google Drive | ✅ | `lib/line/parser.ts` + `testimony-card.tsx` + `google-drive.ts` |
| 自動抽籤 Cron (週一 12:00 TW) | ✅ | `app/api/cron/auto-draw/route.ts` |

### 7. 課程系統 — 完成度：100%

| 規格項目 | 狀態 | 實作位置 |
|---------|------|---------|
| 課程報名 + QR Code | ✅ | `components/Tabs/CourseTab.tsx` |
| 志工掃碼入場 | ✅ | `app/class/checkin/Scanner.tsx` |
| 出席紀錄 | ✅ | CourseAttendance 表 |

### 8. Tab 頁面 — 完成度：100%

| Tab | 元件 | 狀態 |
|-----|------|------|
| daily (每日觀影) | `DailyQuestsTab.tsx` | ✅ |
| weekly (導演報表) | `WeeklyTopicTab.tsx` | ✅ |
| stats (觀影分析) | `StatsTab.tsx` | ✅ |
| rank (票房榜) | `RankTab.tsx` | ✅ |
| captain (製片總部) | `CaptainTab.tsx` | ✅ |
| commandant (片商總部) | `CommandantTab.tsx` | ✅ |
| course (首映曆) | `CourseTab.tsx` | ✅ |

---

## 二、待完成項目 (Gaps) — 依優先級排序

### P1：功能性缺口（影響核心玩法）

| # | 規格要求 | 現況 | 缺口說明 |
|---|---------|------|---------|
| 1 | b1/b2 傳愛計分 (+100/+200) | 部分實作 | 分值未明確定義於 constants，需確認與規格 +100/+200 一致性 |
| 2 | 定課分值動態調整 | 未實作 | 管理員無法即時修改各任務基礎分數，分值硬編碼在 `lib/constants.tsx` |
| 3 | 定課啟停控制 | 部分實作 | 僅臨時任務可啟停，常規定課（q1-q22, w1-w4 等）無法動態停用 |
| 4 | 中途退出仍計入平均人數 | 需確認 | 規格要求退出者仍佔人數分母，需確認 RankTab 計算邏輯 |
| 5 | 道在江湖紀錄片任務 | 未實作 | 規格 §3.5 大隊主題任務（截止 07-20），系統無對應功能 |

### P2：管理功能缺口

| # | 規格要求 | 現況 | 缺口說明 |
|---|---------|------|---------|
| 6 | 成員加入/退出/轉隊 UI | 未實作 | 僅能透過 CSV 重新匯入，無直接操作介面 |

### P3：視覺品牌缺口

| # | 規格要求 | 現況 | 缺口說明 |
|---|---------|------|---------|
| 7 | 調色盤：深海軍藍 #1B2A4A / 電影金 #F5C842 / 戲院紅 #C0392B / 深灰炭黑 #16213E | Netflix 風格配色 | 全站配色不符規格書 |
| 8 | 裝飾圖示：膠卷條紋、打板機、3D眼鏡、擴音器、膠卷圓盤 | 使用 Lucide 通用圖標 | 無電影主題裝飾元素 |
| 9 | 品牌副標「這不是電影」 | 未出現在 UI | 規格書主題名稱未在介面呈現 |

---

## 三、總結

| 類別 | 完成度 |
|------|--------|
| 定課任務系統 | 95% |
| 組織架構 | 85% |
| 計分與排行榜 | 100% |
| 管理後台 | 80% |
| 活動時間軸 | 100% |
| LINE 整合 | 100% |
| 課程系統 | 100% |
| 視覺主題 | 50% |
| **整體** | **~90%** |
