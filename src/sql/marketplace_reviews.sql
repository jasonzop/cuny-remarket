-- marketplace_reviews.sql
-- Safe to run multiple times (idempotent).
-- Paste the entire contents into Supabase → SQL Editor → Run.

-- 1. Table
CREATE TABLE IF NOT EXISTS public.marketplace_user_reviews (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewed_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating      INTEGER     NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reviewer_id, reviewed_id),
  CONSTRAINT no_self_review CHECK (reviewer_id <> reviewed_id)
);

-- 2. RLS
ALTER TABLE public.marketplace_user_reviews ENABLE ROW LEVEL SECURITY;

-- 3. Policies (drop first so re-runs never fail with "already exists")
DROP POLICY IF EXISTS "reviews_public_read"  ON public.marketplace_user_reviews;
DROP POLICY IF EXISTS "reviews_insert_own"   ON public.marketplace_user_reviews;
DROP POLICY IF EXISTS "reviews_update_own"   ON public.marketplace_user_reviews;
DROP POLICY IF EXISTS "reviews_delete_own"   ON public.marketplace_user_reviews;

CREATE POLICY "reviews_public_read" ON public.marketplace_user_reviews
  FOR SELECT USING (true);

CREATE POLICY "reviews_insert_own" ON public.marketplace_user_reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "reviews_update_own" ON public.marketplace_user_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

CREATE POLICY "reviews_delete_own" ON public.marketplace_user_reviews
  FOR DELETE USING (auth.uid() = reviewer_id);

-- 4. Grants (required so the anon / authenticated roles can access the table)
GRANT SELECT                         ON public.marketplace_user_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_user_reviews TO authenticated;
