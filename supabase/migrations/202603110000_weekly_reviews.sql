-- Weekly AI cultivation review, generated on-demand when user opens the weekly tab
CREATE TABLE IF NOT EXISTS "WeeklyReviews" (
    id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id       text        NOT NULL,
    week_label    date        NOT NULL,           -- The Monday of that week (YYYY-MM-DD)
    content       jsonb       NOT NULL,           -- { summary, quote, trend, weeklyRate }
    created_at    timestamptz DEFAULT now() NOT NULL,
    UNIQUE (user_id, week_label)
);

CREATE INDEX IF NOT EXISTS idx_weeklyreviews_user_week
    ON "WeeklyReviews" (user_id, week_label DESC);

ALTER TABLE "WeeklyReviews" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read weekly reviews"
    ON "WeeklyReviews" FOR SELECT
    USING (true);

CREATE POLICY "Allow service role all"
    ON "WeeklyReviews" FOR ALL
    USING (true);
