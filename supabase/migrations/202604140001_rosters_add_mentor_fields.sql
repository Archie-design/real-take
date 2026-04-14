-- 新增介紹人、輔導員、輔導長欄位至 Rosters 表
ALTER TABLE public."Rosters" ADD COLUMN IF NOT EXISTS "introducer"  TEXT;
ALTER TABLE public."Rosters" ADD COLUMN IF NOT EXISTS "mentor"      TEXT;
ALTER TABLE public."Rosters" ADD COLUMN IF NOT EXISTS "head_mentor" TEXT;
