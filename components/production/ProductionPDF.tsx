import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer'

Font.register({
  family: 'Inter',
  src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff',
})

const s = StyleSheet.create({
  page: { fontFamily: 'Inter', padding: 36, fontSize: 9, color: '#111', backgroundColor: '#fff' },
  accentBar: { height: 3, backgroundColor: '#D4860A', marginBottom: 16, marginHorizontal: -36, marginTop: -36 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  docTitle: { fontSize: 18, fontWeight: 'bold', color: '#D4860A', textAlign: 'right' },
  workspaceName: { fontSize: 10, color: '#888', textAlign: 'right', marginTop: 2 },
  videoTitle: { fontSize: 14, fontWeight: 'bold', color: '#111', marginBottom: 2 },
  videoMeta: { fontSize: 9, color: '#666' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 9, fontWeight: 'bold', color: '#D4860A', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  row: { flexDirection: 'row', marginBottom: 3 },
  label: { width: 90, color: '#888', fontSize: 8 },
  value: { flex: 1, color: '#111' },
  bodyText: { color: '#333', lineHeight: 1.5 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f5f5f5', padding: '4 6', marginBottom: 2 },
  tableRow: { flexDirection: 'row', padding: '3 6', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  col0: { width: 20, fontSize: 8 },
  col1: { flex: 3, fontSize: 8 },
  col2: { width: 40, textAlign: 'center', fontSize: 8 },
  col3: { width: 50, fontSize: 8 },
  colHdr: { fontWeight: 'bold', fontSize: 7, color: '#888', textTransform: 'uppercase' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: { backgroundColor: '#FEF3C7', color: '#92400E', paddingVertical: 2, paddingHorizontal: 5, borderRadius: 3, fontSize: 8 },
  footer: { position: 'absolute', bottom: 18, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: '#bbb' },
})

interface Shot { sort_order: number; deskripsi: string; durasi_detik: number | null; angle: string | null }
interface Talent { nama: string; role: string | null; kontak: string | null }
interface PS {
  lokasi_shooting?: string | null; estimasi_durasi?: number | null
  hook?: string | null; body?: string | null; cta?: string | null; on_screen_text?: string | null; insight?: string | null
  equipment_kamera?: string[]; equipment_lensa?: string | null; equipment_audio?: string[]
  equipment_stabilizer?: string[]; equipment_lighting?: string | null
  equipment_drone?: boolean; equipment_drone_type?: string | null; equipment_notes?: string | null
  caption_default?: string | null; hashtags?: string[]
  catatan_editor?: string | null; software_editing?: string | null; preset_warna?: string | null
  background_music?: string | null; voice_over?: boolean
}
interface Video { judul: string; format?: string | null; tema?: string | null; status: string }

interface Props {
  video: Video
  ps: PS
  shots: Shot[]
  talents: Talent[]
  workspaceName?: string
  handle?: string
  generatedAt?: string
}

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={{ height: 1, backgroundColor: '#e5e5e5' }} />
    </View>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  )
}

export function ProductionPDF({ video, ps, shots, talents, workspaceName = 'Kanvas OS', handle, generatedAt }: Props) {
  const durMnt = ps.estimasi_durasi ? Math.floor(ps.estimasi_durasi / 60) : null
  const durSec = ps.estimasi_durasi ? ps.estimasi_durasi % 60 : null
  const durStr = durMnt != null ? `${durMnt}m ${durSec}s` : null

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.accentBar} />

        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.videoTitle}>{video.judul}</Text>
            <Text style={s.videoMeta}>
              {[video.format, video.tema, ps.lokasi_shooting, durStr].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <View>
            <Text style={s.docTitle}>PRODUCTION SHEET</Text>
            <Text style={s.workspaceName}>{workspaceName}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Script */}
        {(ps.hook || ps.body || ps.cta) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Script</Text>
            <Row label="Hook" value={ps.hook} />
            {ps.body && (
              <View style={s.row}>
                <Text style={s.label}>Body</Text>
                <Text style={[s.value, s.bodyText]}>{ps.body}</Text>
              </View>
            )}
            <Row label="CTA" value={ps.cta} />
            <Row label="On-Screen Text" value={ps.on_screen_text} />
          </View>
        )}

        {/* Shot List */}
        {shots.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Shot List</Text>
            <View style={s.tableHeader}>
              <Text style={[s.col0, s.colHdr]}>#</Text>
              <Text style={[s.col1, s.colHdr]}>Deskripsi</Text>
              <Text style={[s.col2, s.colHdr]}>Durasi</Text>
              <Text style={[s.col3, s.colHdr]}>Angle</Text>
            </View>
            {shots.map((shot, i) => (
              <View key={i} style={s.tableRow}>
                <Text style={s.col0}>{i + 1}</Text>
                <Text style={s.col1}>{shot.deskripsi || '—'}</Text>
                <Text style={s.col2}>{shot.durasi_detik != null ? `${shot.durasi_detik}s` : '—'}</Text>
                <Text style={s.col3}>{shot.angle || '—'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Equipment */}
        {(ps.equipment_kamera?.length || ps.equipment_audio?.length || ps.equipment_lensa) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Equipment</Text>
            <Row label="Kamera" value={ps.equipment_kamera?.join(', ')} />
            <Row label="Lensa" value={ps.equipment_lensa} />
            <Row label="Audio" value={ps.equipment_audio?.join(', ')} />
            <Row label="Stabilizer" value={ps.equipment_stabilizer?.join(', ')} />
            <Row label="Lighting" value={ps.equipment_lighting} />
            {ps.equipment_drone && <Row label="Drone" value={ps.equipment_drone_type ?? 'Ya'} />}
            <Row label="Catatan" value={ps.equipment_notes} />
          </View>
        )}

        {/* Talent */}
        {talents.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Talent & Narasumber</Text>
            {talents.map((t, i) => (
              <View key={i} style={s.row}>
                <Text style={s.label}>{t.nama}</Text>
                <Text style={s.value}>{[t.role, t.kontak].filter(Boolean).join(' · ')}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Audio */}
        {(ps.background_music || ps.voice_over) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Audio & Music</Text>
            <Row label="BGM" value={ps.background_music} />
            {ps.voice_over && <Row label="Voice Over" value="Ada" />}
          </View>
        )}

        {/* Caption */}
        {(ps.caption_default || ps.hashtags?.length) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Caption & Distribution</Text>
            {ps.caption_default && (
              <View style={s.row}>
                <Text style={s.label}>Caption</Text>
                <Text style={[s.value, s.bodyText]}>{ps.caption_default}</Text>
              </View>
            )}
            {ps.hashtags?.length ? (
              <View style={[s.row, { marginTop: 4 }]}>
                <Text style={s.label}>Hashtag</Text>
                <View style={[s.tagRow, { flex: 1 }]}>
                  {ps.hashtags.map((h, i) => <Text key={i} style={s.tag}>#{h}</Text>)}
                </View>
              </View>
            ) : null}
          </View>
        )}

        {/* Editing Notes */}
        {(ps.catatan_editor || ps.software_editing) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Editing Notes</Text>
            <Row label="Software" value={ps.software_editing} />
            <Row label="Preset Warna" value={ps.preset_warna} />
            <Row label="Catatan" value={ps.catatan_editor} />
          </View>
        )}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>Generated: {generatedAt ?? new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          <Text style={s.footerText}>{handle ? `@${handle}` : workspaceName}</Text>
        </View>
      </Page>
    </Document>
  )
}
