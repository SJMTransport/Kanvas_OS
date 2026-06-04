-- Assign sequential sort_order to existing videos that all have default 0
-- Uses row_number() ordered by created_at so existing order is preserved
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY workspace_id ORDER BY created_at ASC) - 1 AS rn
  FROM public.videos
  WHERE sort_order = 0 OR sort_order IS NULL
)
UPDATE public.videos v
SET sort_order = r.rn
FROM ranked r
WHERE v.id = r.id;
