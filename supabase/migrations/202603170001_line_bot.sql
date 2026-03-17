-- LINE Bot Integration Tables

-- Record LINE groups the bot has joined
CREATE TABLE IF NOT EXISTS "LineGroups" (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id     TEXT UNIQUE NOT NULL,
    group_name   TEXT,
    registered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store parsed testimonies (親證故事) from LINE groups
CREATE TABLE IF NOT EXISTS "Testimonies" (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    line_group_id    TEXT,
    line_user_id     TEXT NOT NULL,
    display_name     TEXT,
    parsed_name      TEXT,
    parsed_date      DATE,
    parsed_category  TEXT,
    content          TEXT NOT NULL,
    raw_message      TEXT NOT NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);
