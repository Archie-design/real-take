-- ============================================================
-- 修正：q1/q1_dawn 計入每日 3 種上限
-- 規格：每日最多 3 種定課，q1（體運定課）佔其中一個名額
-- ============================================================
DROP FUNCTION IF EXISTS process_checkin(TEXT,TEXT,TEXT,INTEGER,INTEGER,TEXT[],TEXT);

CREATE OR REPLACE FUNCTION process_checkin(
  p_user_id        TEXT,
  p_quest_id       TEXT,
  p_quest_title    TEXT,
  p_quest_reward   INTEGER,
  p_new_level      INTEGER,
  p_flex_quest_ids TEXT[],
  p_logical_today  TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user        RECORD;
  v_dup_count   INTEGER;
  v_flex_count  INTEGER;
  v_new_exp     INTEGER;

  v_logical_date TEXT;
BEGIN
  -- 鎖定使用者列
  SELECT * INTO v_user FROM "CharacterStats" WHERE "UserID" = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '查無此用戶: ' || p_user_id);
  END IF;

  -- ── 重複 / 上限檢查 ──────────────────────────────────────
  IF p_quest_id IN ('q1', 'q1_dawn') THEN
    -- q1 與 q1_dawn 每日互斥
    SELECT COUNT(*) INTO v_dup_count FROM "DailyLogs"
    WHERE "UserID" = p_user_id
      AND "QuestID" IN ('q1', 'q1_dawn')
      AND CASE
            WHEN EXTRACT(HOUR FROM "Timestamp" AT TIME ZONE 'Asia/Taipei') >= 12
            THEN (date("Timestamp" AT TIME ZONE 'Asia/Taipei'))::text
            ELSE (date("Timestamp" AT TIME ZONE 'Asia/Taipei') - INTERVAL '1 day')::text
          END = p_logical_today;
    IF v_dup_count > 0 THEN
      RETURN jsonb_build_object('success', false, 'error', '今日已完成體運定課，無法重複記錄。');
    END IF;
    -- q1/q1_dawn 本身也佔每日3種名額：先查今日總計課數（flex + q1類）
    SELECT COUNT(*) INTO v_flex_count FROM "DailyLogs"
    WHERE "UserID" = p_user_id
      AND ("QuestID" = ANY(p_flex_quest_ids) OR "QuestID" IN ('q1', 'q1_dawn'))
      AND CASE
            WHEN EXTRACT(HOUR FROM "Timestamp" AT TIME ZONE 'Asia/Taipei') >= 12
            THEN (date("Timestamp" AT TIME ZONE 'Asia/Taipei'))::text
            ELSE (date("Timestamp" AT TIME ZONE 'Asia/Taipei') - INTERVAL '1 day')::text
          END = p_logical_today;
    IF v_flex_count >= 3 THEN
      RETURN jsonb_build_object('success', false, 'error', '今日定課已達上限（3 種）。');
    END IF;

  ELSIF p_quest_id = ANY(p_flex_quest_ids) THEN
    -- 同一種每日最多 1 次
    SELECT COUNT(*) INTO v_dup_count FROM "DailyLogs"
    WHERE "UserID" = p_user_id
      AND "QuestID" = p_quest_id
      AND CASE
            WHEN EXTRACT(HOUR FROM "Timestamp" AT TIME ZONE 'Asia/Taipei') >= 12
            THEN (date("Timestamp" AT TIME ZONE 'Asia/Taipei'))::text
            ELSE (date("Timestamp" AT TIME ZONE 'Asia/Taipei') - INTERVAL '1 day')::text
          END = p_logical_today;
    IF v_dup_count > 0 THEN
      RETURN jsonb_build_object('success', false, 'error', '此定課今日已完成。');
    END IF;
    -- 共用上限：每日最多 3 種（含 q1/q1_dawn 佔用的名額）
    SELECT COUNT(*) INTO v_flex_count FROM "DailyLogs"
    WHERE "UserID" = p_user_id
      AND ("QuestID" = ANY(p_flex_quest_ids) OR "QuestID" IN ('q1', 'q1_dawn'))
      AND CASE
            WHEN EXTRACT(HOUR FROM "Timestamp" AT TIME ZONE 'Asia/Taipei') >= 12
            THEN (date("Timestamp" AT TIME ZONE 'Asia/Taipei'))::text
            ELSE (date("Timestamp" AT TIME ZONE 'Asia/Taipei') - INTERVAL '1 day')::text
          END = p_logical_today;
    IF v_flex_count >= 3 THEN
      RETURN jsonb_build_object('success', false, 'error', '今日定課已達上限（3 種，含體運定課）。');
    END IF;

  ELSIF p_quest_id = 'r1' THEN
    SELECT COUNT(*) INTO v_dup_count FROM "DailyLogs"
    WHERE "UserID" = p_user_id
      AND "QuestID" = 'r1'
      AND CASE
            WHEN EXTRACT(HOUR FROM "Timestamp" AT TIME ZONE 'Asia/Taipei') >= 12
            THEN (date("Timestamp" AT TIME ZONE 'Asia/Taipei'))::text
            ELSE (date("Timestamp" AT TIME ZONE 'Asia/Taipei') - INTERVAL '1 day')::text
          END = p_logical_today;
    IF v_dup_count >= 3 THEN
      RETURN jsonb_build_object('success', false, 'error', '今日關係定課已達上限（3 人）。');
    END IF;
  END IF;

  -- ── 計算新數值 ───────────────────────────────────────────
  v_new_exp  := COALESCE(v_user."Exp", 0) + p_quest_reward;

  -- ── 更新 CharacterStats ──────────────────────────────────
  UPDATE "CharacterStats" SET
    "Exp"        = v_new_exp,
    "Level"      = p_new_level,
    "LastCheckIn"= p_logical_today
  WHERE "UserID" = p_user_id;

  -- ── 寫入 DailyLog ────────────────────────────────────────
  INSERT INTO "DailyLogs" ("Timestamp", "UserID", "QuestID", "QuestTitle", "RewardPoints")
  VALUES (NOW(), p_user_id, p_quest_id, p_quest_title, p_quest_reward);

  -- 回傳更新後的使用者資料
  SELECT * INTO v_user FROM "CharacterStats" WHERE "UserID" = p_user_id;
  RETURN jsonb_build_object('success', true, 'rewardCapped', false, 'user', row_to_json(v_user));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
