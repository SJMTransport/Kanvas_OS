-- Allow saved content without a registered creator profile
ALTER TABLE public.creator_saved_content
  ALTER COLUMN creator_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS creator_username TEXT,
  ADD COLUMN IF NOT EXISTS creator_platform TEXT;

-- Update RLS: allow access if creator is linked OR if creator is null (standalone)
DROP POLICY IF EXISTS "creator_content_all" ON public.creator_saved_content;
CREATE POLICY "creator_content_all" ON public.creator_saved_content
  FOR ALL USING (
    CASE
      WHEN creator_id IS NOT NULL THEN
        EXISTS (
          SELECT 1 FROM public.creator_profiles cp
          JOIN public.workspace_members wm ON wm.workspace_id = cp.workspace_id
          WHERE cp.id = creator_id
          AND wm.user_id = auth.uid()
          AND wm.accepted_at IS NOT NULL
        )
      ELSE
        EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.user_id = auth.uid()
          AND wm.accepted_at IS NOT NULL
        )
    END
  );
