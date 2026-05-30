CREATE TABLE public.video_performance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok','instagram','youtube','facebook')),
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  views BIGINT DEFAULT 0, likes INTEGER DEFAULT 0, comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0, saves INTEGER DEFAULT 0,
  -- TikTok
  tt_fyp_pct DECIMAL(5,2), tt_profile_pct DECIMAL(5,2), tt_search_pct DECIMAL(5,2),
  tt_other_pct DECIMAL(5,2), tt_following_pct DECIMAL(5,2),
  tt_total_viewers INTEGER, tt_new_followers INTEGER,
  tt_avg_watch_time TEXT, tt_total_play_time TEXT, tt_watched_full_pct DECIMAL(5,2),
  tt_non_followers_pct DECIMAL(5,2), tt_followers_pct DECIMAL(5,2),
  tt_new_viewers_pct DECIMAL(5,2), tt_returning_pct DECIMAL(5,2),
  tt_top_countries JSONB,
  -- Instagram
  ig_reached INTEGER, ig_engaged INTEGER, ig_reels_interactions INTEGER,
  ig_views_followers_pct DECIMAL(5,2), ig_views_nonfollowers_pct DECIMAL(5,2),
  ig_int_followers_pct DECIMAL(5,2), ig_int_nonfollowers_pct DECIMAL(5,2),
  ig_sources JSONB, ig_top_countries JSONB, ig_profile_activity INTEGER,
  -- YouTube
  yt_subscribers_pct DECIMAL(5,2), yt_nonsubs_pct DECIMAL(5,2),
  yt_sources JSONB, yt_audience_retention TEXT,
  yt_returning_viewers INTEGER, yt_new_viewers INTEGER,
  yt_search_terms TEXT[], yt_top_countries JSONB,
  -- Facebook
  fb_reactions INTEGER, fb_three_sec_views INTEGER, fb_one_min_views INTEGER,
  fb_watch_time TEXT, fb_avg_watch TEXT,
  fb_traffic_sources JSONB, fb_top_countries JSONB,
  -- Audience universal
  aud_male_pct DECIMAL(5,2), aud_female_pct DECIMAL(5,2),
  aud_age_1824 DECIMAL(5,2), aud_age_2534 DECIMAL(5,2), aud_age_35plus DECIMAL(5,2),
  api_sourced BOOLEAN DEFAULT FALSE, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id, platform, recorded_at)
);
