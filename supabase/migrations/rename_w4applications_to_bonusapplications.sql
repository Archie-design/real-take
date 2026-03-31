-- Rename W4Applications to BonusApplications
-- "W4" was legacy naming from the old movie-promotion interview system.
-- This table stores all bonus applications (interview referrals + b3-b7 bonus quests).
ALTER TABLE "W4Applications" RENAME TO "BonusApplications";

COMMENT ON TABLE "BonusApplications" IS 'Stores all bonus applications: interview referrals (quest_id: w4|...) and bonus quests (b3-b7). Previously named W4Applications.';
