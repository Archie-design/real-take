-- ================================================================
-- Achievements 系統補強
--   1. 新增 unlock_source 欄位（auto / admin_manual）
--   2. 新增索引（achievement_id）便於管理後台統計
--   3. 新增 compute_streaks RPC — 每日 cron 呼叫，計算 Streak
-- ================================================================

-- 1. 新增 unlock_source 欄位（若不存在）
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'Achievements'
          AND column_name  = 'unlock_source'
    ) THEN
        ALTER TABLE public."Achievements"
            ADD COLUMN "unlock_source" TEXT NOT NULL DEFAULT 'auto';
    END IF;
END $$;

-- 2. achievement_id 索引（用於管理後台「各成就解鎖率」）
CREATE INDEX IF NOT EXISTS idx_achievements_achievement_id
    ON public."Achievements"("achievement_id");

-- ================================================================
-- 3. compute_streaks RPC
--    Gaps-and-Islands 計算連續邏輯日。
--    「連續」定義：從今天（若今天已打卡）或昨天往回連續不中斷。
--    若昨天也沒打卡則 Streak=0。
-- ================================================================
CREATE OR REPLACE FUNCTION public.compute_streaks()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    today_logical DATE := (
        CASE WHEN EXTRACT(HOUR FROM (now() AT TIME ZONE 'Asia/Taipei')) < 12
             THEN ((now() AT TIME ZONE 'Asia/Taipei')::DATE) - INTERVAL '1 day'
             ELSE ((now() AT TIME ZONE 'Asia/Taipei')::DATE)
        END
    )::DATE;
    updated_count INTEGER := 0;
BEGIN
    WITH user_days AS (
        SELECT
            "UserID" AS user_id,
            (CASE WHEN EXTRACT(HOUR FROM ("Timestamp" AT TIME ZONE 'Asia/Taipei')) < 12
                  THEN (("Timestamp" AT TIME ZONE 'Asia/Taipei')::DATE) - INTERVAL '1 day'
                  ELSE (("Timestamp" AT TIME ZONE 'Asia/Taipei')::DATE)
             END)::DATE AS logical_date
        FROM public."DailyLogs"
        WHERE "QuestID" ~ '^(q|r)'
          AND "Timestamp" > (now() - INTERVAL '365 days')
        GROUP BY "UserID", logical_date
    ),
    islands AS (
        SELECT
            user_id,
            logical_date,
            logical_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY logical_date))::INT AS grp
        FROM user_days
    ),
    grouped AS (
        SELECT
            user_id,
            grp,
            COUNT(*)::INT        AS length,
            MAX(logical_date)    AS last_date
        FROM islands
        GROUP BY user_id, grp
    ),
    current_streak AS (
        SELECT DISTINCT ON (user_id)
            user_id,
            length
        FROM grouped
        WHERE last_date >= today_logical - INTERVAL '1 day'
        ORDER BY user_id, last_date DESC
    )
    UPDATE public."CharacterStats" cs
    SET "Streak" = COALESCE(s.length, 0)
    FROM (
        SELECT "UserID" AS user_id FROM public."CharacterStats"
    ) all_users
    LEFT JOIN current_streak s ON s.user_id = all_users.user_id
    WHERE cs."UserID" = all_users.user_id;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END $$;

COMMENT ON FUNCTION public.compute_streaks IS
  '重算所有使用者的 Streak（連續打卡天數），每日 04:10 Asia/Taipei 由 Vercel Cron 觸發';
