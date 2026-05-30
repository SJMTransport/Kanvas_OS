CREATE TABLE public.brands (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  nama_brand TEXT NOT NULL, industri TEXT, website TEXT,
  pic_name TEXT, pic_email TEXT, pic_whatsapp TEXT, sosmed_brand TEXT,
  status TEXT DEFAULT 'prospect'
    CHECK (status IN ('prospect','approach','negosiasi','deal','aktif','selesai','cold')),
  first_contact_date DATE, last_followup_date DATE, next_followup_date DATE,
  notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.brand_followups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.users(id),
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  catatan TEXT NOT NULL, next_action TEXT, next_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.quotations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  quotation_number TEXT UNIQUE NOT NULL,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE, expired_date DATE,
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft','sent','negotiating','accepted','rejected')),
  items JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(15,2) DEFAULT 0, diskon DECIMAL(15,2) DEFAULT 0,
  tax_pct DECIMAL(5,2) DEFAULT 0, tax_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  payment_terms TEXT, notes TEXT, validity_days INTEGER DEFAULT 14,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.deals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  deal_number TEXT UNIQUE NOT NULL, nama_campaign TEXT NOT NULL,
  tanggal_mulai DATE, tanggal_selesai DATE, nilai_total DECIMAL(15,2),
  status TEXT DEFAULT 'dp_pending'
    CHECK (status IN ('dp_pending','dp_paid','on_progress','delivered','completed')),
  deliverables JSONB DEFAULT '[]', file_kontrak_url TEXT, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.deal_videos (
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  PRIMARY KEY (deal_id, video_id)
);

CREATE TABLE public.invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('dp','pelunasan','full')),
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE, due_date DATE,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(15,2) DEFAULT 0, tax_pct DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0, total DECIMAL(15,2) DEFAULT 0,
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft','sent','overdue','paid','cancelled')),
  payment_date DATE, payment_method TEXT, bukti_bayar_url TEXT, notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
