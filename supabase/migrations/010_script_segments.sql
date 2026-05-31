ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS segments JSONB DEFAULT '[]'::jsonb;
