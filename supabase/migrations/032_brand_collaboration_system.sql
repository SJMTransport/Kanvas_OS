-- ============================================================================
-- Kanvas OS — Brand & Collaboration System Migration (032 - Phase 1)
-- Master Entities: brands, brand_contacts
-- Collaboration Entities: deals, deal_briefs, deal_sows, deal_deliverables, content_deliverables
-- Financial & Milestone Entities: deal_payments, deal_schedules
-- Safe to re-run: guarded with IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- ============================================================================

-- 1. Extend public.brands
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT;

-- 2. Create public.brand_contacts
CREATE TABLE IF NOT EXISTS public.brand_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_brand_contacts_brand ON public.brand_contacts(brand_id);

-- 3. Extend public.deals
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS collaboration_type TEXT DEFAULT 'Campaign',
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS total_value DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS primary_contact_id UUID REFERENCES public.brand_contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deals_workspace ON public.deals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_deals_brand ON public.deals(brand_id);

-- 4. Create public.deal_briefs
CREATE TABLE IF NOT EXISTS public.deal_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE UNIQUE,
  title TEXT,
  brief_content TEXT,
  objective TEXT,
  key_message TEXT,
  mandatory_message TEXT,
  do_list TEXT,
  dont_list TEXT,
  reference_links TEXT,
  attachment_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deal_briefs_deal ON public.deal_briefs(deal_id);

-- 5. Create public.deal_sows
CREATE TABLE IF NOT EXISTS public.deal_sows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version TEXT DEFAULT 'v1',
  status TEXT DEFAULT 'active',
  effective_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deal_sows_deal ON public.deal_sows(deal_id);

-- 6. Create public.deal_deliverables
CREATE TABLE IF NOT EXISTS public.deal_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  sow_id UUID REFERENCES public.deal_sows(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  platform TEXT,
  quantity INTEGER DEFAULT 1,
  unit TEXT DEFAULT 'content',
  value DECIMAL(15,2) DEFAULT 0,
  deadline DATE,
  status TEXT DEFAULT 'planned',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deal_deliverables_deal ON public.deal_deliverables(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_deliverables_sow ON public.deal_deliverables(sow_id);

-- 7. Create public.content_deliverables (Junction table N:M relation)
CREATE TABLE IF NOT EXISTS public.content_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  deliverable_id UUID NOT NULL REFERENCES public.deal_deliverables(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id, deliverable_id)
);
CREATE INDEX IF NOT EXISTS idx_content_deliverables_content ON public.content_deliverables(content_id);
CREATE INDEX IF NOT EXISTS idx_content_deliverables_deliverable ON public.content_deliverables(deliverable_id);

-- 8. Create public.deal_payments
CREATE TABLE IF NOT EXISTS public.deal_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_type TEXT DEFAULT 'dp',
  due_date DATE,
  paid_date DATE,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deal_payments_deal ON public.deal_payments(deal_id);

-- 9. Create public.deal_schedules
CREATE TABLE IF NOT EXISTS public.deal_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT DEFAULT 'shooting',
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deal_schedules_deal ON public.deal_schedules(deal_id);

-- 10. Add deal_id to public.videos for optional direct shortcut
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL;
