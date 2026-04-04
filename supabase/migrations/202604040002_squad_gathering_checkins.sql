-- ============================================================
-- 新增 SquadGatheringCheckins 表
-- 用途：記錄小隊定聚 sq1-sq4 時每位成員的掃碼報到紀錄
-- gathering_id 格式：{themeId}|{teamName}|{YYYY-MM-DD}
-- ============================================================
CREATE TABLE IF NOT EXISTS "SquadGatheringCheckins" (
  id              BIGSERIAL PRIMARY KEY,
  gathering_id    TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  user_name       TEXT,
  checked_in_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(gathering_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sgc_gathering_id ON "SquadGatheringCheckins" (gathering_id);
CREATE INDEX IF NOT EXISTS idx_sgc_user_id ON "SquadGatheringCheckins" (user_id);
