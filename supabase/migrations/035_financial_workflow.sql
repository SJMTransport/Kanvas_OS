-- ============================================================================
-- Kanvas OS — Phase 3.5: Financial Workflow Foundation
-- Quotation -> Deal, Invoice -> Deal/Quotation, Payment -> Invoice.
--
-- Reuses the existing quotations/invoices/deal_payments tables — no new
-- financial tables created. All changes are additive (nullable columns,
-- ON DELETE SET NULL so a deleted parent never cascades away money/billing
-- records).
--
-- Also fixes a real, pre-existing gap: `quotations` has had RLS enabled
-- since migration 006 with ZERO policies ever created (006's own comment
-- says "Brands & quotations: owner + manager only" but only the brands_*
-- policies were actually written) — every quotations read/write via the
-- anon-key client has been silently denied since the table was created.
-- ============================================================================

-- ── 1. Quotation -> Deal ─────────────────────────────────────────────────
-- A quotation is made for a specific Deal/collaboration. Nullable because
-- a quotation can exist before a Deal is formally created (pre-sales), and
-- because deleting a Deal must not destroy the commercial paper trail.

ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quotations_deal ON public.quotations(deal_id);

-- ── 2. Invoice -> Quotation (optional) ──────────────────────────────────
-- An invoice may originate from an accepted quotation, but plenty of
-- legitimate invoices are created directly against a Deal with no
-- quotation at all — this must stay optional.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_quotation ON public.invoices(quotation_id);

-- ── 3. Payment -> Invoice, plus payer/method/proof ──────────────────────
-- Extending the existing deal_payments table rather than creating a new
-- one. invoice_id is nullable: historical/legacy deal_payments rows never
-- had an invoice concept and must keep working, displayed as
-- "Legacy / Belum terhubung ke Invoice" rather than fabricating a link.

ALTER TABLE public.deal_payments
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS proof_url TEXT,
  ADD COLUMN IF NOT EXISTS paid_by TEXT;

CREATE INDEX IF NOT EXISTS idx_deal_payments_invoice ON public.deal_payments(invoice_id);

-- ── 4. Close the quotations RLS gap ──────────────────────────────────────
-- Same tier as `brands` (read=member, write=owner/manager) since a
-- quotation is a commercial document, not day-to-day production data.

CREATE POLICY "quotations_read" ON public.quotations
  FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "quotations_write" ON public.quotations
  FOR ALL USING (public.get_member_role(workspace_id) IN ('owner','manager'));
