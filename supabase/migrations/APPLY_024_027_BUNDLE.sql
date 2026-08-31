-- ============================================================================
-- Kanvas OS — Core Domain Model bundle (migrations 024–027)
-- Run this ONCE in the Supabase SQL editor to apply the Works, Locations,
-- Idea Board junction, and unified Tagging tables in the correct order.
-- Safe to re-run: guarded with IF NOT EXISTS / DROP POLICY IF EXISTS.
-- ============================================================================

-- ── 024: Works + Work Items ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.works (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  cover_url     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_works_workspace ON public.works(workspace_id);

CREATE TABLE IF NOT EXISTS public.work_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id     UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  item_type   TEXT NOT NULL CHECK (item_type IN ('video','idea','reference','location')),
  item_id     UUID NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(work_id, item_type, item_id)
);
CREATE INDEX IF NOT EXISTS idx_work_items_work ON public.work_items(work_id);
CREATE INDEX IF NOT EXISTS idx_work_items_item ON public.work_items(item_type, item_id);

ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "works_read" ON public.works;
DROP POLICY IF EXISTS "works_insert" ON public.works;
DROP POLICY IF EXISTS "works_update" ON public.works;
DROP POLICY IF EXISTS "works_delete" ON public.works;
CREATE POLICY "works_read" ON public.works FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "works_insert" ON public.works FOR INSERT WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "works_update" ON public.works FOR UPDATE USING (is_workspace_member(workspace_id));
CREATE POLICY "works_delete" ON public.works FOR DELETE USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "work_items_read" ON public.work_items;
DROP POLICY IF EXISTS "work_items_insert" ON public.work_items;
DROP POLICY IF EXISTS "work_items_update" ON public.work_items;
DROP POLICY IF EXISTS "work_items_delete" ON public.work_items;
CREATE POLICY "work_items_read" ON public.work_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.works WHERE id = work_id AND is_workspace_member(workspace_id)));
CREATE POLICY "work_items_insert" ON public.work_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.works WHERE id = work_id AND is_workspace_member(workspace_id)));
CREATE POLICY "work_items_update" ON public.work_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.works WHERE id = work_id AND is_workspace_member(workspace_id)));
CREATE POLICY "work_items_delete" ON public.work_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.works WHERE id = work_id AND is_workspace_member(workspace_id)));

DROP TRIGGER IF EXISTS works_updated_at ON public.works;
CREATE TRIGGER works_updated_at BEFORE UPDATE ON public.works
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 025: Locations ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  address       TEXT,
  city          TEXT,
  country       TEXT,
  latitude      NUMERIC,
  longitude     NUMERIC,
  notes         TEXT,
  cover_url     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_locations_workspace ON public.locations(workspace_id);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "locations_read" ON public.locations;
DROP POLICY IF EXISTS "locations_insert" ON public.locations;
DROP POLICY IF EXISTS "locations_update" ON public.locations;
DROP POLICY IF EXISTS "locations_delete" ON public.locations;
CREATE POLICY "locations_read" ON public.locations FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "locations_insert" ON public.locations FOR INSERT WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "locations_update" ON public.locations FOR UPDATE USING (is_workspace_member(workspace_id));
CREATE POLICY "locations_delete" ON public.locations FOR DELETE USING (is_workspace_member(workspace_id));

DROP TRIGGER IF EXISTS locations_updated_at ON public.locations;
CREATE TRIGGER locations_updated_at BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 026: Idea Board Items (junction) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.idea_board_items (
  board_id    UUID NOT NULL REFERENCES public.idea_boards(id) ON DELETE CASCADE,
  idea_id     UUID NOT NULL REFERENCES public.idea_cards(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (board_id, idea_id)
);
CREATE INDEX IF NOT EXISTS idx_idea_board_items_idea ON public.idea_board_items(idea_id);

ALTER TABLE public.idea_board_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "idea_board_items_read" ON public.idea_board_items;
DROP POLICY IF EXISTS "idea_board_items_insert" ON public.idea_board_items;
DROP POLICY IF EXISTS "idea_board_items_update" ON public.idea_board_items;
DROP POLICY IF EXISTS "idea_board_items_delete" ON public.idea_board_items;
CREATE POLICY "idea_board_items_read" ON public.idea_board_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.idea_boards WHERE id = board_id AND is_workspace_member(workspace_id)));
CREATE POLICY "idea_board_items_insert" ON public.idea_board_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.idea_boards WHERE id = board_id AND is_workspace_member(workspace_id)));
CREATE POLICY "idea_board_items_update" ON public.idea_board_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.idea_boards WHERE id = board_id AND is_workspace_member(workspace_id)));
CREATE POLICY "idea_board_items_delete" ON public.idea_board_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.idea_boards WHERE id = board_id AND is_workspace_member(workspace_id)));

-- ── 027: Unified Tagging ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.taggables (
  tag_id      UUID NOT NULL REFERENCES public.workspace_tags(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('work','video','idea','reference','location')),
  entity_id   UUID NOT NULL,
  PRIMARY KEY (tag_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_taggables_entity ON public.taggables(entity_type, entity_id);

ALTER TABLE public.taggables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "taggables_read" ON public.taggables;
DROP POLICY IF EXISTS "taggables_insert" ON public.taggables;
DROP POLICY IF EXISTS "taggables_delete" ON public.taggables;
CREATE POLICY "taggables_read" ON public.taggables FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workspace_tags WHERE id = tag_id AND is_workspace_member(workspace_id)));
CREATE POLICY "taggables_insert" ON public.taggables FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.workspace_tags WHERE id = tag_id AND is_workspace_member(workspace_id)));
CREATE POLICY "taggables_delete" ON public.taggables FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.workspace_tags WHERE id = tag_id AND is_workspace_member(workspace_id)));
