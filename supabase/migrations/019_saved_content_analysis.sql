-- Add analysis fields to creator_saved_content
ALTER TABLE public.creator_saved_content
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS view_count BIGINT,
  ADD COLUMN IF NOT EXISTS analysis JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TRIGGER creator_saved_content_updated_at BEFORE UPDATE ON public.creator_saved_content
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
