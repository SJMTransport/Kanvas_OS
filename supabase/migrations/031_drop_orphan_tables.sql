-- Remove orphan tables that were created in early migrations but never surfaced
-- in the app (zero code references). They add schema clutter without value.
--
-- Kept intentionally (still referenced or reserved for near-term features):
--   taggables, deal_videos, works/work_items, locations, performance_reports.
--
-- Safe: these tables have no UI and (for this workspace) no meaningful data.
-- CASCADE drops their RLS policies and any dependent objects.

DROP TABLE IF EXISTS public.audience_questions CASCADE;
DROP TABLE IF EXISTS public.broll_catalog CASCADE;
DROP TABLE IF EXISTS public.research_competitors CASCADE;
DROP TABLE IF EXISTS public.trend_audios CASCADE;

-- 'ideas' (the legacy simple table) was fully superseded by 'idea_cards'.
DROP TABLE IF EXISTS public.ideas CASCADE;
