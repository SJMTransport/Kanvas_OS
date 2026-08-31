-- Tambah kolom temas (array) untuk multi-tema
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS temas TEXT[] DEFAULT '{}';

-- Migrate data lama: tema TEXT → temas TEXT[]
UPDATE public.videos
SET temas = ARRAY[tema]
WHERE tema IS NOT NULL AND tema != '' AND (temas IS NULL OR temas = '{}');

-- RPC: get unique temas for a workspace
CREATE OR REPLACE FUNCTION get_workspace_temas(ws_id UUID)
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT ARRAY(
    SELECT DISTINCT unnest(temas)
    FROM public.videos
    WHERE workspace_id = ws_id
      AND temas IS NOT NULL
      AND array_length(temas, 1) > 0
    ORDER BY 1
  );
$$;
