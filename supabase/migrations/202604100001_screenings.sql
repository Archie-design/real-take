-- 影展場次管理表
-- 取代硬編碼的 courseConfig.ts，讓後台可動態新增/編輯/刪除場次

CREATE TABLE IF NOT EXISTS public."Screenings" (
    "id"         TEXT PRIMARY KEY,       -- 作為 course_key，e.g. "class_b", "screen_001"
    "name"       TEXT NOT NULL,
    "date"       TEXT NOT NULL,          -- YYYY-MM-DD
    "time"       TEXT NOT NULL,          -- 顯示用，e.g. "19:00–21:40"
    "location"   TEXT NOT NULL,
    "active"     BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT now()
);

-- RLS：公開讀取（報名用），寫入透過 service role key（server actions）
ALTER TABLE public."Screenings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_screenings" ON public."Screenings"
    FOR SELECT USING (true);

-- 預填現有兩場（與舊 courseConfig.ts 完全對應，CourseRegistrations 不受影響）
INSERT INTO public."Screenings" ("id", "name", "date", "time", "location", "active", "created_at")
VALUES
    ('class_b', '第一堂課後課', '2026-06-22', '19:00–21:40', 'Ticc 國際會議中心 201室', true, now()),
    ('class_c', '結業典禮',     '2026-07-20', '13:00–17:30', '新莊頤品飯店',            true, now())
ON CONFLICT ("id") DO NOTHING;
