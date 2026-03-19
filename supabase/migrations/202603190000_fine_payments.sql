-- A. FinePayments 收款紀錄表
CREATE TABLE IF NOT EXISTS "FinePayments" (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "CharacterStats"("UserID") ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  squad_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  period_label TEXT NOT NULL,
  paid_to_captain_at DATE,
  submitted_to_org_at DATE,
  recorded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fine_payments_user_id ON "FinePayments" (user_id);
CREATE INDEX IF NOT EXISTS idx_fine_payments_squad_name ON "FinePayments" (squad_name);

-- B. CharacterStats 新增 FinePaid 欄位（累計已繳款，餘額 = TotalFines - FinePaid）
ALTER TABLE "CharacterStats"
  ADD COLUMN IF NOT EXISTS "FinePaid" INTEGER NOT NULL DEFAULT 0;

-- C. AdminActivityLog（logAdminAction 依賴，若已存在則跳過）
CREATE TABLE IF NOT EXISTS "AdminActivityLog" (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  target_id TEXT,
  target_name TEXT,
  details JSONB,
  result TEXT NOT NULL DEFAULT 'success',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_action ON "AdminActivityLog" (action);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_actor ON "AdminActivityLog" (actor);
