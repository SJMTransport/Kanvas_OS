-- ============================================================================
-- Kanvas OS — Deliverable Tanggal Posting
-- ============================================================================
-- Audit result: existing publishing data lives in video_platform_schedules
-- (tanggal_tayang per platform, per Content row) — this is the ACTUAL,
-- platform-specific publishing schedule, set once Content is ready to go
-- out. It is a different planning level from what a Deliverable needs: a
-- Deliverable is defined at SOW time, often before any Content row (let
-- alone its platform schedules) exists yet, and represents the target
-- "this deliverable must be live by" commitment made to the Brand.
--
-- These are therefore kept as two distinct, non-overwriting fields:
--   - deal_deliverables.posting_date  -> planned posting requirement (SOW-level)
--   - video_platform_schedules.tanggal_tayang -> actual per-platform schedule
-- Neither is derived from or written into the other.
--
-- Table:        deal_deliverables
-- Field:        posting_date
-- Datatype:     DATE
-- Nullability:  NULLABLE
-- Reason:       Give the Deliverable its own planned posting/go-live target,
--               completing the 3-date production model (Shooting / Deadline
--               / Posting) requested for Brand -> Jadwal aggregation.
-- Safe to re-run: guarded with ADD COLUMN IF NOT EXISTS.
-- ============================================================================

ALTER TABLE public.deal_deliverables
  ADD COLUMN IF NOT EXISTS posting_date DATE;
