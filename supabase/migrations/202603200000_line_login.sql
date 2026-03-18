ALTER TABLE "CharacterStats" ADD COLUMN IF NOT EXISTS "LineUserId" TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_characterstats_lineuserid ON "CharacterStats" ("LineUserId");
