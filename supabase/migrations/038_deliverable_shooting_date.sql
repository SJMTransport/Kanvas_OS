-- ============================================================================
-- Kanvas OS — Deliverable Shooting Date
-- ============================================================================
-- Audit result: no shooting-date field exists anywhere on deal_deliverables
-- under any name (only `deadline` = Deadline Output). This adds ONE new
-- planning field for the Deliverable's own planned shooting date.
--
-- Table:        deal_deliverables
-- Field:        shooting_date
-- Datatype:     DATE
-- Nullability:  NULLABLE (a Deliverable may not have a planned date yet)
-- Reason:       The Deliverable needs its own planned shooting date so it
--               can feed the Brand -> Jadwal aggregation as a distinct
--               "Shooting" schedule item, alongside its existing Deadline
--               Output. This is deliberately independent from:
--                 - videos.tanggal_shooting (per-Content actual/assigned date)
--                 - shooting_sessions.session_date (a real production slot,
--                   possibly grouping several Content records)
--               so that none of these three silently overwrite one another.
--               A mismatch between a Deliverable's planned shooting_date and
--               a linked Shooting Session's session_date is surfaced in the
--               UI, never auto-reconciled.
-- Safe to re-run: guarded with ADD COLUMN IF NOT EXISTS.
-- ============================================================================

ALTER TABLE public.deal_deliverables
  ADD COLUMN IF NOT EXISTS shooting_date DATE;
