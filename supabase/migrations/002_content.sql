CREATE TABLE public.videos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.users(id),
  assigned_to UUID REFERENCES public.users(id),
  no_upload INTEGER,
  no_video TEXT,
  judul TEXT NOT NULL,
  format TEXT,
  tema TEXT,
  nama_alat TEXT,
  storage_bahan TEXT,
  storage_video TEXT,
  tanggal_shooting DATE,
  deadline_posting DATE,
  is_endorsement BOOLEAN DEFAULT FALSE,
  brand_id UUID,
  is_video_request BOOLEAN DEFAULT FALSE,
  google_drive_link TEXT,
  caption_default TEXT,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'ide'
    CHECK (status IN ('ide','scripting','produksi','editing','scheduled','live','archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.video_platform_schedules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok','instagram','youtube','facebook')),
  tanggal_tayang DATE NOT NULL,
  jam_post TIME,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','posted','failed')),
  url_post TEXT,
  caption_override TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.scripts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE UNIQUE NOT NULL,
  hook TEXT, body TEXT, cta TEXT, insight TEXT,
  estimated_duration INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.shooting_checklists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL, completed BOOLEAN DEFAULT FALSE, sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.editing_checklists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL, completed BOOLEAN DEFAULT FALSE, sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
