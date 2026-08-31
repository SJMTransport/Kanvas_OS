-- Add video_script column to creator_saved_content table
ALTER TABLE public.creator_saved_content ADD COLUMN IF NOT EXISTS video_script TEXT;
