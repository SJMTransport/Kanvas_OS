-- Shot List reference library (Google Drive clips categorized by shot type)
CREATE TABLE public.shot_list_references (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,

  drive_link TEXT NOT NULL,
  drive_file_id TEXT NOT NULL,
  deskripsi TEXT NOT NULL,

  kategori_shot TEXT NOT NULL
    CHECK (kategori_shot IN ('Opening', 'B-roll', 'PTC', 'Detail', 'Reaction', 'Transisi', 'Closing', 'Halal Food')),
  tipe_shot TEXT NOT NULL
    CHECK (tipe_shot IN ('Wide', 'Medium', 'Close', 'Detail', 'Drone', 'POV')),

  sumber TEXT,
  tags TEXT[] DEFAULT '{}',
  catatan TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.shot_list_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shot_list_references_all" ON public.shot_list_references
  FOR ALL USING (is_workspace_member(workspace_id));
