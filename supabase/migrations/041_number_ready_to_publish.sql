-- ============================================================================
-- Kanvas OS — Assign VID number at "Siap Tayang" (ready_to_publish), not
-- only at Terjadwal/Live
-- ============================================================================
-- Previously auto_assign_no_upload() (022/023) only assigned a real VID-XXX
-- number once the legacy `videos.status` flipped to 'scheduled' or 'live'.
-- The computed lifecycle stage "Siap Tayang" (ready_to_publish — production
-- done + approval ok, schedule not yet created) happens BEFORE that legacy
-- flip, so content sitting at Siap Tayang stayed at 'VID-000'.
--
-- Per product decision:
--   1. A real number, once assigned, is now PERMANENT — moving backward
--      (e.g. a revision reopens after reaching Siap Tayang) no longer
--      resets it to VID-000. Previously ANY non-scheduled/live status
--      reset the number unconditionally.
--   2. Siap Tayang content shares the SAME numbering sequence as
--      Terjadwal/Live (MAX existing number + 1) — not a separate range.
--
-- Both auto_assign_no_upload() (the row-level trigger) and
-- calibrate_workspace_videos() (the manual "Kalibrasi Nomor" RPC used by
-- app/(app)/content/page.tsx and app/(app)/settings/page.tsx) are updated
-- together so a manual recalibration can't undo what the trigger now
-- guarantees to be permanent.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_assign_no_upload()
RETURNS TRIGGER AS $$
DECLARE
  next_num INT;
  qualifies BOOLEAN;
BEGIN
  qualifies := (NEW.status IN ('scheduled', 'live'))
    OR (
      NEW.status <> 'archived'
      AND NEW.production_status = 'ready'
      AND (NEW.approval_status IS NULL OR NEW.approval_status IN ('approved', 'not_required'))
    );

  IF qualifies THEN
    IF NEW.no_video IS NULL OR NEW.no_video = 'VID-000' THEN
      SELECT COALESCE(MAX(NULLIF(regexp_replace(no_video, '\D', '', 'g'), '')::integer), 0) + 1 INTO next_num
      FROM public.videos
      WHERE workspace_id = NEW.workspace_id
        AND (
          status IN ('scheduled', 'live')
          OR (status <> 'archived' AND production_status = 'ready' AND (approval_status IS NULL OR approval_status IN ('approved', 'not_required')))
        );
      NEW.no_video := 'VID-' || LPAD(next_num::text, 3, '0');
    END IF;
  ELSIF NEW.no_video IS NULL OR NEW.no_video = 'VID-000' THEN
    -- Never earned a real number and still doesn't qualify — stays VID-000.
    NEW.no_video := 'VID-000';
  END IF;
  -- else: already has a real number and no longer qualifies (e.g. sent
  -- back to revision after reaching Siap Tayang) — KEPT, per the
  -- "permanent once assigned" decision. This is the behavior change from
  -- 022/023, which unconditionally reset it here.

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.calibrate_workspace_videos(ws_id UUID)
RETURNS VOID AS $$
DECLARE
  v_rec RECORD;
  v_counter INT := 1;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not a member of this workspace';
  END IF;

  ALTER TABLE public.videos DISABLE TRIGGER trigger_auto_assign_no_upload;

  -- Renumber every qualifying video (scheduled/live OR Siap Tayang) in one
  -- shared sequence, ordered the same way as before (sort_order DESC, then
  -- created_at DESC) for scheduled/live, with Siap Tayang videos appended
  -- after by created_at so an explicit manual recalibration still produces
  -- a single deterministic order.
  FOR v_rec IN
    SELECT id
    FROM public.videos
    WHERE workspace_id = ws_id
      AND (
        status IN ('scheduled', 'live')
        OR (status <> 'archived' AND production_status = 'ready' AND (approval_status IS NULL OR approval_status IN ('approved', 'not_required')))
      )
    ORDER BY
      (status IN ('scheduled', 'live')) DESC,
      sort_order DESC NULLS LAST,
      created_at DESC
  LOOP
    UPDATE public.videos
    SET no_video = 'VID-' || LPAD(v_counter::text, 3, '0')
    WHERE id = v_rec.id;

    v_counter := v_counter + 1;
  END LOOP;

  UPDATE public.videos
  SET no_video = 'VID-000'
  WHERE workspace_id = ws_id
    AND status NOT IN ('scheduled', 'live')
    AND NOT (status <> 'archived' AND production_status = 'ready' AND (approval_status IS NULL OR approval_status IN ('approved', 'not_required')));

  ALTER TABLE public.videos ENABLE TRIGGER trigger_auto_assign_no_upload;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
