-- 202604180002_performance_indexes.sql
--
-- 千人規模壓力測試後新增的熱點索引（本次僅做 CREATE INDEX IF NOT EXISTS，可重複執行）
-- 執行方式：Supabase Dashboard → SQL Editor 手動執行，或透過 psql 連線 DATABASE_URL
--
-- 影響查詢：
--   1. idx_dailylogs_user_quest
--      - app/actions/quest.ts 打卡時的 duplicate check
--      - lib/achievements/predicates.ts countQuestLogs / questFirst / questSameDay predicate
--   2. idx_dailylogs_user_ts_streak
--      - supabase/migrations/202604180001_achievements_system.sql::compute_streaks RPC
--      - lib/achievements/predicates.ts currentStreak predicate
--      - partial index：只涵蓋 q/r 開頭 QuestID，降低 index 體積
--   3. idx_characterstats_name
--      - app/page.tsx handleLogin：Name 高選擇性，配合 UserID LIKE suffix 過濾

CREATE INDEX IF NOT EXISTS idx_dailylogs_user_quest
    ON public."DailyLogs" ("UserID", "QuestID");

CREATE INDEX IF NOT EXISTS idx_dailylogs_user_ts_streak
    ON public."DailyLogs" ("UserID", "Timestamp")
    WHERE "QuestID" ~ '^(q|r)';

CREATE INDEX IF NOT EXISTS idx_characterstats_name
    ON public."CharacterStats" ("Name");
