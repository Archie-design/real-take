-- Add screenshot_url column to W4Applications table
ALTER TABLE "W4Applications"
ADD COLUMN IF NOT EXISTS "screenshot_url" TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN "W4Applications"."screenshot_url" IS 'URL of the uploaded screenshot for b5/b6 applications (報名聯誼會)';
