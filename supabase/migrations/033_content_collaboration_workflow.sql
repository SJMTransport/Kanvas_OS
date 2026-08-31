-- ============================================================================
-- Kanvas OS — Content Collaboration Workflow Migration (033 - Phase 2)
-- Independent Status Dimensions: production_status, approval_status, publishing_status
-- Approval History & Aging Tracking
-- Safe to re-run: guarded with IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- ============================================================================

-- 1. Extend public.videos with independent workflow status fields
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS production_status TEXT DEFAULT 'idea',
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS publishing_status TEXT DEFAULT 'not_scheduled',
  ADD COLUMN IF NOT EXISTS approval_waiting_since TIMESTAMPTZ;

-- Sync initial production_status from status if production_status is null
UPDATE public.videos
SET production_status = status
WHERE production_status IS NULL OR production_status = 'idea';

-- 2. Create public.content_approval_history
CREATE TABLE IF NOT EXISTS public.content_approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  action_status TEXT NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_approval_history_content ON public.content_approval_history(content_id);
