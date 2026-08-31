-- ============================================================================
-- Kanvas OS — Shooting Session (Phase: Brand/Deliverable/Content Integration)
-- Purely additive. Does not touch videos.tanggal_shooting's existing role —
-- Calendar's shooting-event logic keeps reading tanggal_shooting exactly as
-- before, unmodified. A Shooting Session is a real-world production time
-- slot (date + start/end + location) that MAY be linked to one or more
-- EXISTING videos rows via a direct nullable FK — never a copy of Content.
-- Safe to re-run: guarded with IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shooting_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shooting_sessions_workspace_date ON public.shooting_sessions(workspace_id, session_date);

-- One video belongs to at most one Shooting Session at a time — a direct
-- nullable FK on videos (rather than a junction table) makes this a schema
-- guarantee, not an app-level convention: it is structurally impossible to
-- create a duplicate "Shooting Content" record, and reassigning a video to
-- a different session is a single UPDATE, never a second row.
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS shooting_session_id UUID REFERENCES public.shooting_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_videos_shooting_session ON public.videos(shooting_session_id);

ALTER TABLE public.shooting_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shooting_sessions_read" ON public.shooting_sessions
  FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "shooting_sessions_write" ON public.shooting_sessions
  FOR ALL USING (public.is_workspace_member(workspace_id));

DROP TRIGGER IF EXISTS shooting_sessions_updated_at ON public.shooting_sessions;
CREATE TRIGGER shooting_sessions_updated_at BEFORE UPDATE ON public.shooting_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
