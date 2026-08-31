-- Add hashtags array to saved content
ALTER TABLE public.creator_saved_content
  ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}';
