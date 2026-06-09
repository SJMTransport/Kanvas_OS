-- ── IDEA INCUBATOR ──

CREATE TYPE public.idea_card_type AS ENUM (
  'scratch', 'link', 'image', 'audio', 'combo'
);

CREATE TABLE public.idea_cards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,

  type public.idea_card_type NOT NULL DEFAULT 'scratch',
  title TEXT,
  body TEXT,
  link_url TEXT,
  link_meta JSONB,
  image_urls TEXT[],
  audio_url TEXT,
  audio_notes TEXT,

  tags TEXT[],
  board_ids UUID[],
  status TEXT DEFAULT 'raw'
    CHECK (status IN ('raw', 'developing', 'ready', 'converted', 'archived')),
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  deadline DATE,

  converted_video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,

  ai_tags TEXT[],
  ai_hooks TEXT[],
  ai_caption JSONB,
  ai_summary TEXT,
  ai_outline JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.idea_boards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  cover_image_url TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CREATOR INCUBATOR ──

CREATE TABLE public.creator_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,

  username TEXT NOT NULL,
  display_name TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok','instagram','youtube','facebook','pinterest','twitter','threads')),
  profile_url TEXT,
  avatar_url TEXT,
  niche TEXT,
  followers_count TEXT,

  why_saved TEXT,
  rating INTEGER DEFAULT 3 CHECK (rating BETWEEN 1 AND 5),

  analysis JSONB DEFAULT '{
    "format": "",
    "avg_duration": "",
    "content_type": "",
    "posting_frequency": "",
    "hook_style": "",
    "hook_examples": [],
    "edit_pace": "",
    "music_style": "",
    "onscreen_text": "",
    "engagement_approach": "",
    "cta_style": "",
    "community_notes": "",
    "key_learnings": ""
  }',
  analysis_status TEXT DEFAULT 'pending'
    CHECK (analysis_status IN ('pending', 'in_progress', 'done')),

  ai_analysis TEXT,
  ai_learnings TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.creator_saved_content (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id UUID REFERENCES public.creator_profiles(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  thumbnail_url TEXT,
  link_meta JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.idea_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_saved_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "idea_cards_all" ON public.idea_cards
  FOR ALL USING (is_workspace_member(workspace_id));
CREATE POLICY "idea_boards_all" ON public.idea_boards
  FOR ALL USING (is_workspace_member(workspace_id));
CREATE POLICY "creator_profiles_all" ON public.creator_profiles
  FOR ALL USING (is_workspace_member(workspace_id));
CREATE POLICY "creator_content_all" ON public.creator_saved_content
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      JOIN public.workspace_members wm ON wm.workspace_id = cp.workspace_id
      WHERE cp.id = creator_id
      AND wm.user_id = auth.uid()
      AND wm.accepted_at IS NOT NULL
    )
  );

-- Triggers
CREATE TRIGGER idea_cards_updated_at BEFORE UPDATE ON public.idea_cards
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER creator_profiles_updated_at BEFORE UPDATE ON public.creator_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Storage bucket for incubator images (run separately in Storage UI or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('incubator-images', 'incubator-images', true);
