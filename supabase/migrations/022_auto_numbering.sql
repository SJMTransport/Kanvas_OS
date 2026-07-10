-- Trigger function to automatically assign no_video on status transitions
CREATE OR REPLACE FUNCTION public.auto_assign_no_upload()
RETURNS TRIGGER AS $$
DECLARE
  next_num INT;
BEGIN
  -- If status changes to scheduled or live
  IF NEW.status IN ('scheduled', 'live') THEN
    -- Clear target date (deadline_posting) automatically
    NEW.deadline_posting := NULL;
    
    IF NEW.no_video IS NULL OR NEW.no_video = 'VID-000' THEN
      SELECT COALESCE(MAX(NULLIF(regexp_replace(no_video, '\D', '', 'g'), '')::integer), 0) + 1 INTO next_num
      FROM public.videos
      WHERE workspace_id = NEW.workspace_id AND status IN ('scheduled', 'live');
      
      NEW.no_video := 'VID-' || LPAD(next_num::text, 3, '0');
    END IF;
  -- If status is NOT scheduled or live
  ELSIF NEW.status NOT IN ('scheduled', 'live') THEN
    NEW.no_video := 'VID-000';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_assign_no_upload ON public.videos;
CREATE TRIGGER trigger_auto_assign_no_upload
  BEFORE INSERT OR UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_no_upload();

-- Stored procedure to calibrate/re-sequence all progressive videos in a workspace
CREATE OR REPLACE FUNCTION public.calibrate_workspace_videos(ws_id UUID)
RETURNS VOID AS $$
DECLARE
  v_rec RECORD;
  v_counter INT := 1;
BEGIN
  -- Security check: Ensure the caller (auth.uid()) is a member of the target workspace
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not a member of this workspace';
  END IF;

  -- Disable the trigger temporarily to prevent it from interfering with manual calibration values
  ALTER TABLE public.videos DISABLE TRIGGER trigger_auto_assign_no_upload;

  -- 1. Renumber all scheduled/live videos in order of sort_order DESC (from the bottom up) and clear deadline_posting
  FOR v_rec IN 
    SELECT id 
    FROM public.videos 
    WHERE workspace_id = ws_id AND status IN ('scheduled', 'live')
    ORDER BY sort_order DESC NULLS LAST, created_at DESC
  LOOP
    UPDATE public.videos 
    SET no_video = 'VID-' || LPAD(v_counter::text, 3, '0'),
        deadline_posting = NULL
    WHERE id = v_rec.id;
    
    v_counter := v_counter + 1;
  END LOOP;

  -- 2. Set all other videos (not scheduled/live) to 'VID-000'
  UPDATE public.videos 
  SET no_video = 'VID-000' 
  WHERE workspace_id = ws_id AND status NOT IN ('scheduled', 'live');

  -- Re-enable the trigger
  ALTER TABLE public.videos ENABLE TRIGGER trigger_auto_assign_no_upload;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
