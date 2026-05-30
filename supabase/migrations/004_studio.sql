CREATE TABLE public.ideas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.users(id),
  title TEXT NOT NULL,
  source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual','link','audio')),
  content TEXT, linked_video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.broll_catalog (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL, folder_path TEXT, hdd_id TEXT, mood_tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.trend_audios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL, artist TEXT, mood_tags TEXT[], link TEXT,
  transcript TEXT, analysis_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.research_competitors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  account_name TEXT NOT NULL, platform TEXT, followers TEXT, engagement_rate TEXT,
  notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.audience_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL, author TEXT, converted BOOLEAN DEFAULT FALSE,
  linked_video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
