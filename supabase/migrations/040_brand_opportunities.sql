-- ============================================================================
-- Kanvas OS — Prospect Opportunity + Follow-up link (Phase 3A)
-- ============================================================================
-- Audit result (see conversation): no existing table/column represents a
-- per-Brand opportunity pipeline. brands.status already models the
-- Brand's own business status (prospect/active/selesai) — that is a
-- DIFFERENT concept from an Opportunity's stage, and one Brand may have
-- several Opportunities, each independently staged. brand_followups
-- already exists (005_brand.sql) with exactly the shape a follow-up
-- history needs, but RLS was enabled on it with no policy ever added —
-- making it unusable by the app until now. This migration is purely
-- additive: one new table, one new nullable FK column, and the missing
-- RLS policies. No existing table is altered destructively, no existing
-- row is touched, no backfill is performed.
-- ============================================================================

-- 1. brand_opportunities — a Brand may have zero or more Opportunities.
CREATE TABLE IF NOT EXISTS public.brand_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'baru'
    CHECK (stage IN ('baru', 'dihubungi', 'follow_up', 'proposal', 'menunggu_respons', 'berhasil', 'tidak_jadi')),
  estimated_value NUMERIC NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_brand_opportunities_brand ON public.brand_opportunities(brand_id);

DROP TRIGGER IF EXISTS brand_opportunities_updated_at ON public.brand_opportunities;
CREATE TRIGGER brand_opportunities_updated_at BEFORE UPDATE ON public.brand_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. brand_followups gains an OPTIONAL link to the Opportunity it was
-- made for. A follow-up is a history/action record; it is not required
-- to belong to any Opportunity (general brand-level follow-ups remain
-- valid with opportunity_id = NULL).
ALTER TABLE public.brand_followups
  ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES public.brand_opportunities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_brand_followups_opportunity ON public.brand_followups(opportunity_id);

-- 3. RLS — brand_opportunities (new) and brand_followups (was enabled in
-- 006_rls.sql with NO policy ever added, so it has been unreachable by
-- any query since it was created). Both follow the same "any workspace
-- member may read/write" convention already used for deal_deliverables /
-- deal_schedules (034_harden_collaboration_workflow.sql) — prospecting
-- activity is day-to-day operational data, not financial data like
-- invoices/payments (owner-only) or PIC contact details (owner/manager
-- only, brand_contacts_write).
ALTER TABLE public.brand_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_opportunities_read" ON public.brand_opportunities FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND public.is_workspace_member(b.workspace_id))
);
CREATE POLICY "brand_opportunities_write" ON public.brand_opportunities FOR ALL USING (
  EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND public.is_workspace_member(b.workspace_id))
);

CREATE POLICY "brand_followups_read" ON public.brand_followups FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND public.is_workspace_member(b.workspace_id))
);
CREATE POLICY "brand_followups_write" ON public.brand_followups FOR ALL USING (
  EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND public.is_workspace_member(b.workspace_id))
);
