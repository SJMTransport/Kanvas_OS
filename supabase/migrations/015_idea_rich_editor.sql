-- Add body_json for Tiptap rich text + template_type
ALTER TABLE public.idea_cards
  ADD COLUMN IF NOT EXISTS body_json JSONB,
  ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'blank'
    CHECK (template_type IN (
      'blank','script','rough_idea',
      'content_analysis','shot_list','campaign_idea'
    ));
