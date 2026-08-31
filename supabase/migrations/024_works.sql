-- Works: the primary creative container ("What are you working on?")
-- A Work groups Ideas, References, Outputs, and Locations together.

CREATE TABLE public.works (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  cover_url     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_works_workspace ON public.works(workspace_id);

-- Work Items: polymorphic junction linking a Work to its contents
CREATE TABLE public.work_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id     UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  item_type   TEXT NOT NULL CHECK (item_type IN ('video','idea','reference','location')),
  item_id     UUID NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(work_id, item_type, item_id)
);

CREATE INDEX idx_work_items_work ON public.work_items(work_id);
CREATE INDEX idx_work_items_item ON public.work_items(item_type, item_id);

-- RLS
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "works_read" ON public.works
  FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "works_insert" ON public.works
  FOR INSERT WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "works_update" ON public.works
  FOR UPDATE USING (is_workspace_member(workspace_id));
CREATE POLICY "works_delete" ON public.works
  FOR DELETE USING (is_workspace_member(workspace_id));

CREATE POLICY "work_items_read" ON public.work_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.works WHERE id = work_id AND is_workspace_member(workspace_id))
  );
CREATE POLICY "work_items_insert" ON public.work_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.works WHERE id = work_id AND is_workspace_member(workspace_id))
  );
CREATE POLICY "work_items_update" ON public.work_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.works WHERE id = work_id AND is_workspace_member(workspace_id))
  );
CREATE POLICY "work_items_delete" ON public.work_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.works WHERE id = work_id AND is_workspace_member(workspace_id))
  );

-- Auto updated_at
CREATE TRIGGER works_updated_at BEFORE UPDATE ON public.works
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
