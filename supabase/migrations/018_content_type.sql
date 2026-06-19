-- Add content_type and image_urls columns to videos
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'video'
    CHECK (content_type IN ('video', 'foto')),
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';
