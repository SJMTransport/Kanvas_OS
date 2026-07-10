-- Trigger function to automatically assign no_video on status transitions
CREATE OR REPLACE FUNCTION public.auto_assign_no_upload()
RETURNS TRIGGER AS $$
DECLARE
  next_num INT;
BEGIN
  -- If status changes to something other than 'ide' and no_video is null
  IF NEW.status != 'ide' AND NEW.no_video IS NULL THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(no_video, '\D', '', 'g'), '')::integer), 0) + 1 INTO next_num
    FROM public.videos
    WHERE workspace_id = NEW.workspace_id AND status != 'ide';
    
    NEW.no_video := 'VID-' || LPAD(next_num::text, 3, '0');
  -- If status is changed back to 'ide', clear the number
  ELSIF NEW.status = 'ide' THEN
    NEW.no_video := NULL;
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
-- SECURITY DEFINER is used to allow authenticated users to temporarily disable/enable the trigger
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

  -- Renumber all non-ide videos in order of sort_order DESC (from the bottom up)
  FOR v_rec IN 
    SELECT id 
    FROM public.videos 
    WHERE workspace_id = ws_id AND status != 'ide' 
    ORDER BY sort_order DESC NULLS LAST, created_at DESC
  LOOP
    UPDATE public.videos 
    SET no_video = 'VID-' || LPAD(v_counter::text, 3, '0') 
    WHERE id = v_rec.id;
    
    v_counter := v_counter + 1;
  END LOOP;

  -- Re-enable the trigger
  ALTER TABLE public.videos ENABLE TRIGGER trigger_auto_assign_no_upload;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
