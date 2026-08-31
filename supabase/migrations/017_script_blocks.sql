-- Add script_blocks JSONB column to videos
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS script_blocks JSONB DEFAULT '[]';

-- Migrate existing data from production_sheets (hook/body/cta fields)
UPDATE public.videos v
SET script_blocks = (
  SELECT jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid(), 'type', 'hook',
      'label', 'Hook', 'content', COALESCE(ps.hook, ''), 'order', 0),
    jsonb_build_object('id', gen_random_uuid(), 'type', 'body',
      'label', 'Body', 'content', COALESCE(ps.body, ''), 'order', 1),
    jsonb_build_object('id', gen_random_uuid(), 'type', 'cta',
      'label', 'CTA (Call to Action)', 'content', COALESCE(ps.cta, ''), 'order', 2),
    jsonb_build_object('id', gen_random_uuid(), 'type', 'insight',
      'label', 'Insight / Director''s Note', 'content', '', 'order', 3),
    jsonb_build_object('id', gen_random_uuid(), 'type', 'on_screen',
      'label', 'On-Screen Text', 'content', '', 'order', 4)
  )
  FROM public.production_sheets ps WHERE ps.video_id = v.id
)
WHERE EXISTS (SELECT 1 FROM public.production_sheets ps WHERE ps.video_id = v.id)
  AND (v.script_blocks IS NULL OR v.script_blocks = '[]'::jsonb);
