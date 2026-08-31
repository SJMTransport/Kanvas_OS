import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'
import type { Platform } from '@/lib/types'

Font.register({
  family: 'Inter',
  src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff',
})

const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  facebook: 'Facebook',
}

const PLATFORM_COLORS: Record<Platform, string> = {
  tiktok: '#010101',
  instagram: '#E1306C',
  youtube: '#FF0000',
  facebook: '#1877F2',
}

const s = StyleSheet.create({
  page: { flexDirection: 'row', backgroundColor: '#fff', fontFamily: 'Inter' },
  accentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: '#D4860A' },
  left: { width: 210, backgroundColor: '#111', position: 'relative' },
  thumbnail: { width: 210, height: 297, objectFit: 'cover' },
  thumbnailPlaceholder: { width: 210, height: 297, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  thumbnailPlaceholderText: { color: '#555', fontSize: 12 },
  right: { flex: 1, padding: 28, paddingTop: 18 },
  platformLabel: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  videoTitle: { fontSize: 20, fontWeight: 'bold', color: '#111', marginBottom: 4, lineHeight: 1.3 },
  dateText: { fontSize: 10, color: '#888', marginBottom: 20 },
  metricsStrip: { flexDirection: 'row', gap: 16, marginBottom: 20, backgroundColor: '#fafafa', borderRadius: 8, padding: 12 },
  metricBox: { flex: 1, alignItems: 'center' },
  metricValue: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  metricLabel: { fontSize: 8, color: '#888', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  columnsRow: { flexDirection: 'row', gap: 14, flex: 1 },
  column: { flex: 1 },
  sectionTitle: { fontSize: 8, fontWeight: 'bold', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  rowLabel: { fontSize: 9, color: '#555' },
  rowValue: { fontSize: 9, fontWeight: 'bold', color: '#111' },
  footer: { position: 'absolute', bottom: 12, left: 28, right: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerHandle: { fontSize: 9, color: '#aaa' },
  footerPlatform: { fontSize: 9, fontWeight: 'bold' },
})

function formatNum(val: string | number | undefined): string {
  if (!val && val !== 0) return '—'
  const n = typeof val === 'string' ? parseFloat(val) : val
  if (isNaN(n)) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

function formatPct(val: string | number | undefined): string {
  if (!val && val !== 0) return '—'
  const n = typeof val === 'string' ? parseFloat(val) : val
  if (isNaN(n)) return '—'
  return n + '%'
}

type DataRow = { label: string; value: string | number | undefined; isPct?: boolean }
type Section = { title: string; rows: DataRow[] }

function buildSections(platform: Platform, data: Record<string, string | number>): Section[][] {
  if (platform === 'tiktok') {
    const col1: Section[] = [
      { title: 'Traffic Sources', rows: [
        { label: 'For You', value: data.tt_fyp_pct, isPct: true },
        { label: 'Profile', value: data.tt_profile_pct, isPct: true },
        { label: 'Search', value: data.tt_search_pct, isPct: true },
        { label: 'Other', value: data.tt_other_pct, isPct: true },
        { label: 'Following', value: data.tt_following_pct, isPct: true },
      ]},
    ]
    const col2: Section[] = [
      { title: 'Key Metrics', rows: [
        { label: 'Total Viewers', value: data.tt_total_viewers },
        { label: 'New Followers', value: data.tt_new_followers },
        { label: 'Avg Watch Time', value: data.tt_avg_watch_time },
        { label: 'Watched Full', value: data.tt_watched_full_pct, isPct: true },
      ]},
    ]
    const col3: Section[] = [
      { title: 'Viewer Type', rows: [
        { label: 'Non-followers', value: data.tt_non_followers_pct, isPct: true },
        { label: 'Followers', value: data.tt_followers_pct, isPct: true },
        { label: 'New Viewers', value: data.tt_new_viewers_pct, isPct: true },
        { label: 'Returning', value: data.tt_returning_pct, isPct: true },
      ]},
      { title: 'Audience', rows: [
        { label: 'Pria', value: data.aud_male_pct, isPct: true },
        { label: 'Wanita', value: data.aud_female_pct, isPct: true },
        { label: '18–24', value: data.aud_age_1824, isPct: true },
        { label: '25–34', value: data.aud_age_2534, isPct: true },
        { label: '>35', value: data.aud_age_35plus, isPct: true },
      ]},
    ]
    return [col1, col2, col3]
  }

  if (platform === 'instagram') {
    const col1: Section[] = [
      { title: 'Reach & Engagement', rows: [
        { label: 'Reached', value: data.ig_reached },
        { label: 'Engaged', value: data.ig_engaged },
        { label: 'Reels Interactions', value: data.ig_reels_interactions },
        { label: 'Profile Activity', value: data.ig_profile_activity },
      ]},
    ]
    const col2: Section[] = [
      { title: 'Views Breakdown', rows: [
        { label: 'Followers', value: data.ig_views_followers_pct, isPct: true },
        { label: 'Non-followers', value: data.ig_views_nonfollowers_pct, isPct: true },
      ]},
    ]
    const col3: Section[] = [
      { title: 'Audience', rows: [
        { label: 'Pria', value: data.aud_male_pct, isPct: true },
        { label: 'Wanita', value: data.aud_female_pct, isPct: true },
        { label: '18–24', value: data.aud_age_1824, isPct: true },
        { label: '25–34', value: data.aud_age_2534, isPct: true },
        { label: '>35', value: data.aud_age_35plus, isPct: true },
      ]},
    ]
    return [col1, col2, col3]
  }

  if (platform === 'youtube') {
    const col1: Section[] = [
      { title: 'Audience', rows: [
        { label: 'Subscribers', value: data.yt_subscribers_pct, isPct: true },
        { label: 'Non-subs', value: data.yt_nonsubs_pct, isPct: true },
        { label: 'Returning Viewers', value: data.yt_returning_viewers },
        { label: 'New Viewers', value: data.yt_new_viewers },
      ]},
    ]
    const col2: Section[] = [
      { title: 'Demographics', rows: [
        { label: 'Pria', value: data.aud_male_pct, isPct: true },
        { label: 'Wanita', value: data.aud_female_pct, isPct: true },
        { label: '18–24', value: data.aud_age_1824, isPct: true },
        { label: '25–34', value: data.aud_age_2534, isPct: true },
        { label: '>35', value: data.aud_age_35plus, isPct: true },
      ]},
    ]
    return [col1, col2, []]
  }

  // facebook
  const col1: Section[] = [
    { title: 'Video Metrics', rows: [
      { label: '3-sec Views', value: data.fb_three_sec_views },
      { label: '1-min Views', value: data.fb_one_min_views },
      { label: 'Watch Time', value: data.fb_watch_time },
      { label: 'Avg Watch', value: data.fb_avg_watch },
      { label: 'Reactions', value: data.fb_reactions },
    ]},
  ]
  const col2: Section[] = [
    { title: 'Demographics', rows: [
      { label: 'Pria', value: data.aud_male_pct, isPct: true },
      { label: 'Wanita', value: data.aud_female_pct, isPct: true },
      { label: '18–24', value: data.aud_age_1824, isPct: true },
      { label: '25–34', value: data.aud_age_2534, isPct: true },
      { label: '>35', value: data.aud_age_35plus, isPct: true },
    ]},
  ]
  return [col1, col2, []]
}

interface PageProps {
  platform: Platform
  data: Record<string, string | number>
  video: { judul: string; thumbnail_url?: string | null }
  date: string
  handle?: string
}

function ReportPage({ platform, data, video, date, handle }: PageProps) {
  const color = PLATFORM_COLORS[platform]
  const label = PLATFORM_LABELS[platform]
  const columns = buildSections(platform, data)
  const mainMetrics = [
    { label: 'Views', value: formatNum(data.views) },
    { label: 'Likes', value: formatNum(data.likes) },
    { label: 'Comments', value: formatNum(data.comments) },
    { label: 'Shares', value: formatNum(data.shares ?? data.saves) },
  ]

  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <View style={s.accentBar} />

      {/* Left: thumbnail */}
      <View style={s.left}>
        {video.thumbnail_url ? (
          <Image src={video.thumbnail_url} style={s.thumbnail} />
        ) : (
          <View style={s.thumbnailPlaceholder}>
            <Text style={s.thumbnailPlaceholderText}>No Thumbnail</Text>
          </View>
        )}
      </View>

      {/* Right: content */}
      <View style={s.right}>
        <Text style={[s.platformLabel, { color }]}>{label}</Text>
        <Text style={s.videoTitle}>{video.judul}</Text>
        <Text style={s.dateText}>{date}</Text>

        {/* Metrics strip */}
        <View style={s.metricsStrip}>
          {mainMetrics.map((m) => (
            <View key={m.label} style={s.metricBox}>
              <Text style={s.metricValue}>{m.value}</Text>
              <Text style={s.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* 3-column data */}
        <View style={s.columnsRow}>
          {columns.map((sections, ci) => (
            <View key={ci} style={s.column}>
              {sections.map((sec) => (
                <View key={sec.title} style={{ marginBottom: 12 }}>
                  <Text style={s.sectionTitle}>{sec.title}</Text>
                  {sec.rows.map((row) => (
                    <View key={row.label} style={s.row}>
                      <Text style={s.rowLabel}>{row.label}</Text>
                      <Text style={s.rowValue}>{row.isPct ? formatPct(row.value) : formatNum(row.value)}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerHandle}>{handle ? `@${handle}` : ''}</Text>
          <Text style={[s.footerPlatform, { color }]}>{label}</Text>
        </View>
      </View>
    </Page>
  )
}

interface VideoReportPDFProps {
  video: { judul: string; thumbnail_url?: string | null }
  platformData: Partial<Record<Platform, Record<string, string | number>>>
  singlePlatform?: Platform
  date?: string
  handle?: string
}

export function VideoReportPDF({ video, platformData, singlePlatform, date, handle }: VideoReportPDFProps) {
  const platforms: Platform[] = singlePlatform
    ? [singlePlatform]
    : (['tiktok', 'instagram', 'youtube', 'facebook'] as Platform[]).filter((p) => platformData[p])

  const dateStr = date ?? new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Document>
      {platforms.map((p) => (
        <ReportPage
          key={p}
          platform={p}
          data={platformData[p] ?? {}}
          video={video}
          date={dateStr}
          handle={handle}
        />
      ))}
    </Document>
  )
}
