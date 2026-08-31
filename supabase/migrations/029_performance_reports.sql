-- Performance Reports (Laporan): a bulk report composed from existing videos.
-- Follows the KOL-report workflow: pick existing videos into a campaign, fill
-- campaign info, generate a multi-page report. The whole report payload lives in
-- one JSONB column (campaign info + ordered videos with per-platform data),
-- mirroring the single-document model of the original generator.

CREATE TABLE public.performance_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name          TEXT NOT NULL DEFAULT 'Laporan Baru',
  kol_name      TEXT,
  data          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_performance_reports_workspace ON public.performance_reports(workspace_id, updated_at DESC);

ALTER TABLE public.performance_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "performance_reports_read" ON public.performance_reports
  FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "performance_reports_insert" ON public.performance_reports
  FOR INSERT WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "performance_reports_update" ON public.performance_reports
  FOR UPDATE USING (is_workspace_member(workspace_id));
CREATE POLICY "performance_reports_delete" ON public.performance_reports
  FOR DELETE USING (is_workspace_member(workspace_id));

CREATE TRIGGER performance_reports_updated_at BEFORE UPDATE ON public.performance_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
