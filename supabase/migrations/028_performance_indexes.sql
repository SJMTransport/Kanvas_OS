-- Performance: add indexes on hot foreign-key / filter columns.
-- Postgres does NOT auto-index FK columns, so every workspace-scoped list query
-- and every child-table join was doing a sequential scan. These indexes turn
-- those into index scans, which is the single biggest performance win for the app.
--
-- Safe to run repeatedly (IF NOT EXISTS) and safe on production (no data change).

-- videos: filtered by workspace_id on nearly every page; status/updated_at used by dashboard & content.
CREATE INDEX IF NOT EXISTS idx_videos_workspace ON public.videos(workspace_id);
CREATE INDEX IF NOT EXISTS idx_videos_workspace_status ON public.videos(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_videos_workspace_updated ON public.videos(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_brand ON public.videos(brand_id);

-- video_platform_schedules: joined from videos, filtered by date on calendar & dashboard.
CREATE INDEX IF NOT EXISTS idx_vps_video ON public.video_platform_schedules(video_id);
CREATE INDEX IF NOT EXISTS idx_vps_tanggal ON public.video_platform_schedules(tanggal_tayang);
CREATE INDEX IF NOT EXISTS idx_vps_social_account ON public.video_platform_schedules(social_account_id);

-- video_performance: wide table joined on content list, performance page, detail panel.
CREATE INDEX IF NOT EXISTS idx_video_performance_video ON public.video_performance(video_id);

-- Per-video child tables (production workspace).
CREATE INDEX IF NOT EXISTS idx_scripts_video ON public.scripts(video_id);
CREATE INDEX IF NOT EXISTS idx_shooting_checklists_video ON public.shooting_checklists(video_id);
CREATE INDEX IF NOT EXISTS idx_editing_checklists_video ON public.editing_checklists(video_id);
CREATE INDEX IF NOT EXISTS idx_production_sheets_video ON public.production_sheets(video_id);
CREATE INDEX IF NOT EXISTS idx_shot_list_video ON public.shot_list(video_id);
CREATE INDEX IF NOT EXISTS idx_talent_list_video ON public.talent_list(video_id);
CREATE INDEX IF NOT EXISTS idx_moodboard_video ON public.moodboard(video_id);

-- Workspace-scoped tables.
CREATE INDEX IF NOT EXISTS idx_social_accounts_workspace ON public.social_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ideas_workspace ON public.ideas(workspace_id);
CREATE INDEX IF NOT EXISTS idx_idea_cards_workspace ON public.idea_cards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_idea_boards_workspace ON public.idea_boards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_workspace ON public.creator_profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_tags_workspace ON public.workspace_tags(workspace_id);

-- Brand / billing pipeline.
CREATE INDEX IF NOT EXISTS idx_brands_workspace ON public.brands(workspace_id);
CREATE INDEX IF NOT EXISTS idx_brands_workspace_followup ON public.brands(workspace_id, next_followup_date);
CREATE INDEX IF NOT EXISTS idx_brand_followups_brand ON public.brand_followups(brand_id);
CREATE INDEX IF NOT EXISTS idx_quotations_workspace ON public.quotations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_quotations_brand ON public.quotations(brand_id);
CREATE INDEX IF NOT EXISTS idx_deals_workspace ON public.deals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_deals_brand ON public.deals(brand_id);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace ON public.invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace_status ON public.invoices(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_brand ON public.invoices(brand_id);

-- workspace_members: read on every workspace resolution / RLS check.
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON public.workspace_members(workspace_id);

-- creator_saved_content: joined from creator profiles and referenced by works.
CREATE INDEX IF NOT EXISTS idx_creator_saved_content_creator ON public.creator_saved_content(creator_id);

-- Dashboard pillar breakdown: aggregate in the DB instead of fetching every video's
-- pilar_konten column and counting client-side. Returns one row per pillar with its count.
CREATE OR REPLACE FUNCTION public.pilar_konten_counts(ws_id UUID)
RETURNS TABLE(pilar_konten TEXT, count BIGINT) AS $$
  SELECT v.pilar_konten, COUNT(*)::BIGINT
  FROM public.videos v
  WHERE v.workspace_id = ws_id
    AND v.pilar_konten IS NOT NULL
  GROUP BY v.pilar_konten;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
