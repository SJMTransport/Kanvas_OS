-- Locations: reusable physical places with creative context

CREATE TABLE public.locations (
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

CREATE INDEX idx_locations_workspace ON public.locations(workspace_id);

-- RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locations_read" ON public.locations
  FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "locations_insert" ON public.locations
  FOR INSERT WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "locations_update" ON public.locations
  FOR UPDATE USING (is_workspace_member(workspace_id));
CREATE POLICY "locations_delete" ON public.locations
  FOR DELETE USING (is_workspace_member(workspace_id));

CREATE TRIGGER locations_updated_at BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
