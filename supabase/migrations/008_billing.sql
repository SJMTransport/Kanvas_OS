-- Add billing fields to workspaces for PDF headers
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS billing_name TEXT,
  ADD COLUMN IF NOT EXISTS billing_address TEXT,
  ADD COLUMN IF NOT EXISTS billing_city TEXT,
  ADD COLUMN IF NOT EXISTS billing_phone TEXT,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS billing_npwp TEXT,
  ADD COLUMN IF NOT EXISTS billing_bank_name TEXT,
  ADD COLUMN IF NOT EXISTS billing_bank_account TEXT,
  ADD COLUMN IF NOT EXISTS billing_bank_holder TEXT;

-- Add `nama` column alias for workspaces (used throughout app)
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS nama TEXT;

-- Sync nama from name
UPDATE public.workspaces SET nama = name WHERE nama IS NULL;

-- Add invited_by to workspace_members
ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES public.users(id);
