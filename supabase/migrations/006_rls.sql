-- Enable RLS semua table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_platform_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shooting_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editing_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broll_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_audios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audience_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid() AND accepted_at IS NOT NULL
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_member_role(ws_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.workspace_members
  WHERE workspace_id = ws_id AND user_id = auth.uid() AND accepted_at IS NOT NULL LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Users
CREATE POLICY "users_self" ON public.users FOR ALL USING (id = auth.uid());

-- Workspaces
CREATE POLICY "workspaces_read" ON public.workspaces
  FOR SELECT USING (is_workspace_member(id) OR owner_id = auth.uid());
CREATE POLICY "workspaces_owner_write" ON public.workspaces
  FOR ALL USING (owner_id = auth.uid());

-- Members
CREATE POLICY "members_read" ON public.workspace_members
  FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "members_owner_write" ON public.workspace_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
  );

-- Videos
CREATE POLICY "videos_read" ON public.videos
  FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "videos_insert" ON public.videos
  FOR INSERT WITH CHECK (is_workspace_member(workspace_id));
CREATE POLICY "videos_update" ON public.videos
  FOR UPDATE USING (
    get_member_role(workspace_id) IN ('owner','manager') OR assigned_to = auth.uid()
  );
CREATE POLICY "videos_delete" ON public.videos
  FOR DELETE USING (get_member_role(workspace_id) IN ('owner','manager'));

-- Brands & quotations: owner + manager only
CREATE POLICY "brands_read" ON public.brands
  FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "brands_write" ON public.brands
  FOR ALL USING (get_member_role(workspace_id) IN ('owner','manager'));

-- Invoices: owner only
CREATE POLICY "invoices_owner" ON public.invoices
  FOR ALL USING (get_member_role(workspace_id) = 'owner');
