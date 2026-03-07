-- Create the MapEntities table
CREATE TABLE IF NOT EXISTS public."MapEntities" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    q INTEGER NOT NULL,
    r INTEGER NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    data JSONB,
    owner_id TEXT REFERENCES public."CharacterStats"("UserID") ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public."MapEntities" ENABLE ROW LEVEL SECURITY;

-- Allow reading active entities
CREATE POLICY "Allow public read on active map entities" ON public."MapEntities"
    FOR SELECT
    USING (is_active = true);

-- Allow server action inserts/updates (Service Role bypasses RLS, but adding permissive for testing convenience if needed)
CREATE POLICY "Allow authenticated inserts" ON public."MapEntities"
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow authenticated updates" ON public."MapEntities"
    FOR UPDATE
    USING (true);
