-- Trigger function to automatically assign no_upload on status transitions
CREATE OR REPLACE FUNCTION public.auto_assign_no_upload()
RETURNS TRIGGER AS $$
DECLARE
  next_num INT;
BEGIN
  -- If status changes to something other than 'ide' and no_upload is null
  IF NEW.status != 'ide' AND NEW.no_upload IS NULL THEN
    SELECT COALESCE(MAX(no_upload), 0) + 1 INTO next_num
    FROM public.videos
    WHERE workspace_id = NEW.workspace_id AND status != 'ide';
    
    NEW.no_upload := next_num;
  -- If status is changed back to 'ide', clear the number
  ELSIF NEW.status = 'ide' THEN
    NEW.no_upload := NULL;
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
  -- Disable the trigger temporarily to prevent it from interfering with manual calibration values
  ALTER TABLE public.videos DISABLE TRIGGER trigger_auto_assign_no_upload;

  -- Renumber all non-ide videos in order of created_at
  FOR v_rec IN 
    SELECT id 
    FROM public.videos 
    WHERE workspace_id = ws_id AND status != 'ide' 
    ORDER BY created_at ASC
  LOOP
    UPDATE public.videos 
    SET no_upload = v_counter 
    WHERE id = v_rec.id;
    
    v_counter := v_counter + 1;
  END LOOP;

  -- Re-enable the trigger
  ALTER TABLE public.videos ENABLE TRIGGER trigger_auto_assign_no_upload;
END;
$$ LANGUAGE plpgsql;
