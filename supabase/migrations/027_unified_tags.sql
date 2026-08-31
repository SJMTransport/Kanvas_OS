-- Unified tagging system.
-- Replaces scattered tags[] arrays and workspace_tags with one system.
-- workspace_tags is kept for backward compat; new code uses this table.

CREATE TABLE public.taggables (
  tag_id      UUID NOT NULL REFERENCES public.workspace_tags(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('work','video','idea','reference','location')),
  entity_id   UUID NOT NULL,
  PRIMARY KEY (tag_id, entity_type, entity_id)
);

CREATE INDEX idx_taggables_entity ON public.taggables(entity_type, entity_id);

-- RLS
ALTER TABLE public.taggables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "taggables_read" ON public.taggables
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workspace_tags WHERE id = tag_id AND is_workspace_member(workspace_id))
  );
CREATE POLICY "taggables_insert" ON public.taggables
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_tags WHERE id = tag_id AND is_workspace_member(workspace_id))
  );
CREATE POLICY "taggables_delete" ON public.taggables
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.workspace_tags WHERE id = tag_id AND is_workspace_member(workspace_id))
  );
