CREATE TABLE IF NOT EXISTS "CourseRegistrations" (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "CharacterStats"("UserID") ON DELETE CASCADE,
  course_key TEXT NOT NULL,          -- 'class_b' | 'class_c'
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_key)
);

CREATE TABLE IF NOT EXISTS "CourseAttendance" (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "CharacterStats"("UserID") ON DELETE CASCADE,
  course_key TEXT NOT NULL,
  attended_at TIMESTAMPTZ DEFAULT NOW(),
  checked_in_by TEXT,                -- 掃碼管理員備注 或 'admin'
  UNIQUE(user_id, course_key)
);

CREATE INDEX IF NOT EXISTS idx_course_reg_user ON "CourseRegistrations" (user_id);
CREATE INDEX IF NOT EXISTS idx_course_att_user ON "CourseAttendance" (user_id);
