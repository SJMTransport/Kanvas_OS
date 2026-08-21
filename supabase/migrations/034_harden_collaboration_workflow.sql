-- ============================================================================
-- Kanvas OS — Harden Brand/Deal/Workflow migrations 032 & 033.
--
-- 032/033 introduced the Brand→Deal→Brief→SOW→Deliverable→Content model and
-- the production/approval/publishing workflow dimensions, but shipped with
-- two real gaps this migration closes:
--
--   (a) None of the 8 new tables from 032/033 (nor the pre-existing `deals`
--       table, which has had RLS enabled with zero policy since migration
--       006) have any RLS policy. All app writes to these tables go through
--       the anon-key client directly (confirmed in app code — there is no
--       service-role bypass), so without a policy they are either fully
--       open (RLS was never enabled on the new tables) or fully denied
--       (`deals`, RLS enabled, no policy). Both are wrong.
--
--   (b) 033's one-time backfill set production_status = the OLD videos.status
--       value verbatim (`SET production_status = status WHERE
--       production_status IS NULL OR production_status = 'idea'`), which
--       runs for every row (all rows start at the 'idea' default). That
--       copies values like 'produksi', 'scheduled', 'live', 'archived'
--       straight into a column whose own UI config
--       (lib/utils/workflow.ts PRODUCTION_STATUS_CONFIG) only recognizes
--       idea/scripting/production/editing/ready — i.e. most existing
--       content now has a production_status value its own badge config
--       doesn't know how to render. publishing_status was never backfilled
--       at all beyond its column default, so already-published content
--       reads as "not scheduled" in the new dimension.
--
-- What this migration does NOT touch: approval_status. Unlike
-- production_status/publishing_status, approval_status already has a real
-- write path in production (Content Detail → Brand tab → "Update Approval
-- Status"). A blind bulk backfill risks overwriting genuine approval
-- actions taken since 032/033 shipped, which would violate the same
-- "never fabricate/overwrite history" principle content_approval_history
-- itself is built to respect. Its CHECK constraint below is additive only
-- and accepts every value the existing UI already writes — it does not
-- require any data change first.

-- ── 1. Fix the production_status / publishing_status backfill ──────────────
--
-- Safe to run unconditionally: no UI in the app writes production_status
-- or publishing_status today (confirmed — only approval_status has a write
-- path), so recomputing both from the untouched videos.status column
-- cannot clobber a real user edit. This must stop being safe to blindly
-- rerun the moment an editing UI for either field ships — that phase
-- should replace this step, not run alongside it.

UPDATE public.videos SET
  production_status = CASE status
    WHEN 'ide'       THEN 'idea'
    WHEN 'scripting' THEN 'scripting'
    WHEN 'produksi'  THEN 'production'
    WHEN 'editing'   THEN 'editing'
    WHEN 'scheduled' THEN 'ready'
    WHEN 'live'      THEN 'ready'
    WHEN 'archived'  THEN 'ready'
    ELSE 'idea'
  END,
  publishing_status = CASE
    WHEN status = 'scheduled' THEN 'scheduled'
    WHEN status = 'live' THEN 'published'
    WHEN status = 'archived' THEN (
      CASE WHEN EXISTS (
        SELECT 1 FROM public.video_platform_schedules s
        WHERE s.video_id = videos.id
          AND (s.status = 'posted' OR (s.url_post IS NOT NULL AND btrim(s.url_post) <> ''))
      ) THEN 'published' ELSE 'not_scheduled' END
    )
    ELSE 'not_scheduled'
  END;

-- ── 2. Constrain the three workflow columns going forward ──────────────────
-- Values match what's actually referenced in lib/utils/workflow.ts and the
-- approval-status Select in app/(app)/content/[id]/page.tsx.

ALTER TABLE public.videos
  ADD CONSTRAINT videos_production_status_check
    CHECK (production_status IN ('idea','scripting','production','editing','ready')),
  ADD CONSTRAINT videos_approval_status_check
    CHECK (approval_status IN ('not_required','not_submitted','waiting_approval','revision_requested','revision_submitted','approved')),
  ADD CONSTRAINT videos_publishing_status_check
    CHECK (publishing_status IN ('not_scheduled','scheduled','published'));

-- ── 3. RLS: the pre-existing `deals` gap ────────────────────────────────────
-- `deals` has had RLS enabled with no policy since migration 006 — every
-- read/write from the app's anon-key client has been silently denied.
-- The new Deal Detail page (app/(app)/brand/deals/[id]/page.tsx) depends on
-- this table working. Mirrors the existing `brands_read`/`brands_write`
-- tier: any workspace member can read, only owner/manager can write.

CREATE POLICY "deals_read" ON public.deals
  FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "deals_write" ON public.deals
  FOR ALL USING (public.get_member_role(workspace_id) IN ('owner','manager'));

-- ── 4. RLS for the 8 new tables from 032/033 ────────────────────────────────
-- Two tiers, matching existing house conventions:
--   - brand_contacts: same sensitivity as `brands` itself → read=member,
--     write=owner/manager.
--   - deal_briefs / deal_sows / deal_deliverables / deal_schedules:
--     day-to-day collaboration/production data → read=member, write=member
--     (mirrors production_sheets' any-member convention, not brands').
--   - deal_payments: financial, mirrors `invoices_owner` → owner-only, both
--     read and write.
--   - content_deliverables / content_approval_history: video-scoped, joined
--     through videos like production_sheets already does. Any member can
--     read and write (link/unlink deliverables, submit for approval) —
--     content_approval_history is INSERT-only from the app (no UPDATE/
--     DELETE policy — "never overwrite past records" per its own code
--     comment).

ALTER TABLE public.brand_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_sows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_approval_history ENABLE ROW LEVEL SECURITY;

-- brand_contacts (brand_id -> brands.workspace_id)
CREATE POLICY "brand_contacts_read" ON public.brand_contacts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND public.is_workspace_member(b.workspace_id))
);
CREATE POLICY "brand_contacts_write" ON public.brand_contacts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND public.get_member_role(b.workspace_id) IN ('owner','manager'))
);

-- deal_briefs (deal_id -> deals.workspace_id)
CREATE POLICY "deal_briefs_read" ON public.deal_briefs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND public.is_workspace_member(d.workspace_id))
);
CREATE POLICY "deal_briefs_write" ON public.deal_briefs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND public.is_workspace_member(d.workspace_id))
);

-- deal_sows (deal_id -> deals.workspace_id)
CREATE POLICY "deal_sows_read" ON public.deal_sows FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND public.is_workspace_member(d.workspace_id))
);
CREATE POLICY "deal_sows_write" ON public.deal_sows FOR ALL USING (
  EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND public.is_workspace_member(d.workspace_id))
);

-- deal_deliverables (deal_id -> deals.workspace_id)
CREATE POLICY "deal_deliverables_read" ON public.deal_deliverables FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND public.is_workspace_member(d.workspace_id))
);
CREATE POLICY "deal_deliverables_write" ON public.deal_deliverables FOR ALL USING (
  EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND public.is_workspace_member(d.workspace_id))
);

-- deal_schedules (deal_id -> deals.workspace_id)
CREATE POLICY "deal_schedules_read" ON public.deal_schedules FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND public.is_workspace_member(d.workspace_id))
);
CREATE POLICY "deal_schedules_write" ON public.deal_schedules FOR ALL USING (
  EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND public.is_workspace_member(d.workspace_id))
);

-- deal_payments (deal_id -> deals.workspace_id) — financial, owner-only, matches invoices_owner
CREATE POLICY "deal_payments_owner" ON public.deal_payments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND public.get_member_role(d.workspace_id) = 'owner')
);

-- content_deliverables (content_id -> videos.workspace_id)
CREATE POLICY "content_deliverables_read" ON public.content_deliverables FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.videos v WHERE v.id = content_id AND public.is_workspace_member(v.workspace_id))
);
CREATE POLICY "content_deliverables_write" ON public.content_deliverables FOR ALL USING (
  EXISTS (SELECT 1 FROM public.videos v WHERE v.id = content_id AND public.is_workspace_member(v.workspace_id))
);

-- content_approval_history (content_id -> videos.workspace_id) — append-only from the app
CREATE POLICY "content_approval_history_read" ON public.content_approval_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.videos v WHERE v.id = content_id AND public.is_workspace_member(v.workspace_id))
);
CREATE POLICY "content_approval_history_insert" ON public.content_approval_history FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.videos v WHERE v.id = content_id AND public.is_workspace_member(v.workspace_id))
);
