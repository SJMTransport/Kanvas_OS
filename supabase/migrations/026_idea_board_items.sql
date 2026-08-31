-- Replace the board_ids UUID[] anti-pattern with a proper junction table.
-- The board_ids column is kept for now (backward compat) but new code uses this table.

CREATE TABLE public.idea_board_items (
  board_id    UUID NOT NULL REFERENCES public.idea_boards(id) ON DELETE CASCADE,
  idea_id     UUID NOT NULL REFERENCES public.idea_cards(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (board_id, idea_id)
);

CREATE INDEX idx_idea_board_items_idea ON public.idea_board_items(idea_id);

-- RLS
ALTER TABLE public.idea_board_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "idea_board_items_read" ON public.idea_board_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.idea_boards WHERE id = board_id AND is_workspace_member(workspace_id))
  );
CREATE POLICY "idea_board_items_insert" ON public.idea_board_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.idea_boards WHERE id = board_id AND is_workspace_member(workspace_id))
  );
CREATE POLICY "idea_board_items_update" ON public.idea_board_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.idea_boards WHERE id = board_id AND is_workspace_member(workspace_id))
  );
CREATE POLICY "idea_board_items_delete" ON public.idea_board_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.idea_boards WHERE id = board_id AND is_workspace_member(workspace_id))
  );
