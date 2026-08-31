-- Migration: Add media_url and is_story to video_platform_schedules
ALTER TABLE public.video_platform_schedules ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.video_platform_schedules ADD COLUMN IF NOT EXISTS is_story BOOLEAN DEFAULT FALSE;
