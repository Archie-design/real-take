-- Fix MapEntities RLS: grant anon role full CRUD and add DELETE policy
-- The existing policies use USING(true) but anon might lack table-level grants

-- Ensure anon and authenticated roles have full table access
GRANT SELECT, INSERT, UPDATE, DELETE ON public."MapEntities" TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."MapEntities" TO authenticated;

-- Add missing DELETE policy
CREATE POLICY "Allow public delete on map entities" ON public."MapEntities"
    FOR DELETE
    USING (true);
