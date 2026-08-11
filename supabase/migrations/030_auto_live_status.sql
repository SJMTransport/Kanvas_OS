-- Auto-promote videos from 'scheduled' to 'live' once they are actually posted.
-- Rule: a video that is 'scheduled' becomes 'live' when it has at least one
-- platform schedule that (a) has a posting link (url_post) filled in, and
-- (b) whose tanggal_tayang has arrived or passed (<= today).
--
-- This runs in two places so both triggers of the condition are covered:
--   1. A row-level trigger on video_platform_schedules — fires the moment a
--      link is added/edited on an already-due schedule.
--   2. A workspace-wide RPC the app calls on load — catches videos whose date
--      passed after the link was already there (time moving forward).

-- Promote a single video if it now qualifies.
CREATE OR REPLACE FUNCTION public.maybe_promote_video_live(v_id UUID)
RETURNS VOID AS $$
  UPDATE public.videos v
  SET status = 'live'
  WHERE v.id = v_id
    AND v.status = 'scheduled'
    AND EXISTS (
      SELECT 1 FROM public.video_platform_schedules s
      WHERE s.video_id = v.id
        AND s.url_post IS NOT NULL
        AND btrim(s.url_post) <> ''
        AND s.tanggal_tayang <= CURRENT_DATE
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- Trigger: when a schedule is inserted/updated, re-check its parent video.
CREATE OR REPLACE FUNCTION public.trg_schedule_promote_live()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.maybe_promote_video_live(NEW.video_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS schedule_promote_live ON public.video_platform_schedules;
CREATE TRIGGER schedule_promote_live
  AFTER INSERT OR UPDATE OF url_post, tanggal_tayang ON public.video_platform_schedules
  FOR EACH ROW EXECUTE FUNCTION public.trg_schedule_promote_live();

-- Workspace-wide sweep, called by the app when the content list loads.
CREATE OR REPLACE FUNCTION public.promote_scheduled_to_live(ws_id UUID)
RETURNS INTEGER AS $$
  WITH promoted AS (
    UPDATE public.videos v
    SET status = 'live'
    WHERE v.workspace_id = ws_id
      AND v.status = 'scheduled'
      AND EXISTS (
        SELECT 1 FROM public.video_platform_schedules s
        WHERE s.video_id = v.id
          AND s.url_post IS NOT NULL
          AND btrim(s.url_post) <> ''
          AND s.tanggal_tayang <= CURRENT_DATE
      )
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER FROM promoted;
$$ LANGUAGE sql SECURITY DEFINER;
