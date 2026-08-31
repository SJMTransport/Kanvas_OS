-- ============================================================================
-- Kanvas OS — Link Shooting Session to existing SOW/Deal Milestone
-- Purely additive. The SOW Shooting milestone (deal_schedules where
-- type = 'shooting') and the Shooting Session must not become two
-- unrelated dates for the same production activity. Rather than adding a
-- second "planned shooting date" field, a Shooting Session may optionally
-- reference the EXISTING deal_schedules row that represents that plan.
-- Safe to re-run: guarded with ADD COLUMN IF NOT EXISTS.
-- ============================================================================

ALTER TABLE public.shooting_sessions
  ADD COLUMN IF NOT EXISTS deal_schedule_id UUID REFERENCES public.deal_schedules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shooting_sessions_deal_schedule ON public.shooting_sessions(deal_schedule_id);
