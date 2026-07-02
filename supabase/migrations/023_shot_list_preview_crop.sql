-- Manual zoom/pan controls so users can frame source clips that contain
-- extraneous UI chrome (e.g. screen recordings) within the 9:16 preview.
ALTER TABLE public.shot_list_references
  ADD COLUMN IF NOT EXISTS preview_zoom NUMERIC NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS preview_offset_y NUMERIC NOT NULL DEFAULT 0;
