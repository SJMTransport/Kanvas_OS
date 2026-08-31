ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
-- Initialize sort_order from existing no_upload or row order
UPDATE public.videos SET sort_order = COALESCE(no_upload, 0) WHERE sort_order = 0;
