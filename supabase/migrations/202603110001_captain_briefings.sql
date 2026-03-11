-- CaptainBriefings: stores AI-generated captain briefings, one per captain per week
CREATE TABLE IF NOT EXISTS "CaptainBriefings" (
    id          BIGSERIAL PRIMARY KEY,
    user_id     TEXT        NOT NULL,
    week_label  DATE        NOT NULL,
    content     JSONB       NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, week_label)
);

CREATE INDEX IF NOT EXISTS idx_captainbriefings_user_week
    ON "CaptainBriefings" (user_id, week_label DESC);

ALTER TABLE "CaptainBriefings" ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own briefings
CREATE POLICY "captain_briefings_select_own"
    ON "CaptainBriefings" FOR SELECT
    USING (auth.uid()::text = user_id);

-- Service role (server actions) can do everything
CREATE POLICY "captain_briefings_service_all"
    ON "CaptainBriefings" FOR ALL
    USING (true);
