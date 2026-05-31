-- Production Sheet tables (Sesi 6)
CREATE TABLE IF NOT EXISTS public.production_sheets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE UNIQUE NOT NULL,
  lokasi_shooting TEXT,
  estimasi_durasi INTEGER,
  hook TEXT, body TEXT, cta TEXT, insight TEXT, on_screen_text TEXT,
  equipment_kamera TEXT[], equipment_lensa TEXT, equipment_audio TEXT[],
  equipment_stabilizer TEXT[], equipment_lighting TEXT,
  equipment_drone BOOLEAN DEFAULT FALSE, equipment_drone_type TEXT, equipment_notes TEXT,
  background_music TEXT, background_music_link TEXT, sound_effect TEXT,
  voice_over BOOLEAN DEFAULT FALSE,
  trend_audio_id UUID REFERENCES public.trend_audios(id) ON DELETE SET NULL,
  caption_default TEXT, hashtags TEXT[],
  caption_tiktok TEXT, caption_instagram TEXT, caption_youtube TEXT, caption_facebook TEXT,
  referensi_video_urls TEXT[], color_palette TEXT, style_note TEXT,
  catatan_editor TEXT, software_editing TEXT, preset_warna TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shot_list (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deskripsi TEXT NOT NULL,
  durasi_detik INTEGER,
  angle TEXT,
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.talent_list (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  nama TEXT NOT NULL, role TEXT, kontak TEXT, catatan TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.moodboard (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL, caption TEXT, sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.production_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shot_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moodboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ps_read" ON public.production_sheets FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.videos v JOIN public.workspace_members wm
    ON wm.workspace_id = v.workspace_id
    WHERE v.id = video_id AND wm.user_id = auth.uid() AND wm.accepted_at IS NOT NULL));
CREATE POLICY "ps_write" ON public.production_sheets FOR ALL USING (
  EXISTS (SELECT 1 FROM public.videos v JOIN public.workspace_members wm
    ON wm.workspace_id = v.workspace_id
    WHERE v.id = video_id AND wm.user_id = auth.uid() AND wm.accepted_at IS NOT NULL));

CREATE POLICY "sl_read" ON public.shot_list FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.videos v JOIN public.workspace_members wm
    ON wm.workspace_id = v.workspace_id
    WHERE v.id = video_id AND wm.user_id = auth.uid() AND wm.accepted_at IS NOT NULL));
CREATE POLICY "sl_write" ON public.shot_list FOR ALL USING (
  EXISTS (SELECT 1 FROM public.videos v JOIN public.workspace_members wm
    ON wm.workspace_id = v.workspace_id
    WHERE v.id = video_id AND wm.user_id = auth.uid() AND wm.accepted_at IS NOT NULL));

CREATE POLICY "tl_read" ON public.talent_list FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.videos v JOIN public.workspace_members wm
    ON wm.workspace_id = v.workspace_id
    WHERE v.id = video_id AND wm.user_id = auth.uid() AND wm.accepted_at IS NOT NULL));
CREATE POLICY "tl_write" ON public.talent_list FOR ALL USING (
  EXISTS (SELECT 1 FROM public.videos v JOIN public.workspace_members wm
    ON wm.workspace_id = v.workspace_id
    WHERE v.id = video_id AND wm.user_id = auth.uid() AND wm.accepted_at IS NOT NULL));

CREATE POLICY "mb_read" ON public.moodboard FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.videos v JOIN public.workspace_members wm
    ON wm.workspace_id = v.workspace_id
    WHERE v.id = video_id AND wm.user_id = auth.uid() AND wm.accepted_at IS NOT NULL));
CREATE POLICY "mb_write" ON public.moodboard FOR ALL USING (
  EXISTS (SELECT 1 FROM public.videos v JOIN public.workspace_members wm
    ON wm.workspace_id = v.workspace_id
    WHERE v.id = video_id AND wm.user_id = auth.uid() AND wm.accepted_at IS NOT NULL));

CREATE TRIGGER ps_updated_at BEFORE UPDATE ON public.production_sheets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
