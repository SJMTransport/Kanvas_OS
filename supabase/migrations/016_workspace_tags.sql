-- Colored tags for Incubator
CREATE TABLE IF NOT EXISTS public.workspace_tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

ALTER TABLE public.workspace_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_workspace_all" ON public.workspace_tags
  FOR ALL USING (is_workspace_member(workspace_id));
