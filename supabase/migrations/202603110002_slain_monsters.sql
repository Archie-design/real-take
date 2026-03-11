-- SlainMonsters: tracks which procedural monsters a player has killed today
-- Procedural entities are re-generated client-side from a daily hash seed, so we
-- must persist kills server-side and re-suppress them on every page load.
CREATE TABLE IF NOT EXISTS "SlainMonsters" (
    id          BIGSERIAL PRIMARY KEY,
    user_id     TEXT        NOT NULL,
    hex_key     TEXT        NOT NULL,   -- matches proceduralEntity.key (e.g. "corridor_anger_5,-3")
    day_label   DATE        NOT NULL,   -- YYYY-MM-DD in Asia/Taipei
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, hex_key, day_label)
);

CREATE INDEX IF NOT EXISTS idx_slainmonsters_user_day
    ON "SlainMonsters" (user_id, day_label DESC);

ALTER TABLE "SlainMonsters" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slain_monsters_select_own"
    ON "SlainMonsters" FOR SELECT
    USING (auth.uid()::text = user_id);

CREATE POLICY "slain_monsters_service_all"
    ON "SlainMonsters" FOR ALL
    USING (true);
