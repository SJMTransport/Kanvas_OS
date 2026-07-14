-- Migration: Add OAuth columns to social_accounts table
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS access_token TEXT;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS refresh_token TEXT;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS is_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS scopes TEXT[];
