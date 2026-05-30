import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer'

Font.register({
  family: 'Inter',
  src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff',
})

const s = StyleSheet.create({
  page: { fontFamily: 'Inter', padding: 40, fontSize: 10, color: '#111' },
  accentBar: { height: 4, backgroundColor: '#D4860A', marginBottom: 24, marginHorizontal: -40, marginTop: -40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  companyName: { fontSize: 16, fontWeight: 'bold', color: '#111', marginBottom: 4 },
  companyInfo: { fontSize: 9, color: '#666', lineHeight: 1.5 },
  docTitle: { fontSize: 20, fontWeight: 'bold', color: '#D4860A', textAlign: 'right' },
  docMeta: { fontSize: 9, color: '#666', textAlign: 'right', lineHeight: 1.7 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 16 },
  brandBox: { backgroundColor: '#fafafa', borderRadius: 6, padding: 12, marginBottom: 16 },
  brandLabel: { fontSize: 8, color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  brandName: { fontSize: 13, fontWeight: 'bold' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#111', color: '#fff', padding: '6 8', borderRadius: 4, marginBottom: 2 },
  tableRow: { flexDirection: 'row', padding: '5 8', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  tableRowAlt: { backgroundColor: '#fafafa' },
  col1: { flex: 3 },
  col2: { flex: 1.5, textAlign: 'center' },
  col3: { flex: 1, textAlign: 'center' },
  col4: { flex: 1.2, textAlign: 'right' },
  col5: { flex: 1.5, textAlign: 'right' },
  headerCell: { fontSize: 8, color: '#fff', fontWeight: 'bold', textTransform: 'uppercase' },
  totalsSection: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  totalsBox: { width: 220 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { color: '#666', fontSize: 9 },
  totalValue: { fontSize: 9, fontWeight: 'bold' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 1, borderTopColor: '#111', marginTop: 4 },
  grandLabel: { fontWeight: 'bold', fontSize: 11 },
  grandValue: { fontWeight: 'bold', fontSize: 11, color: '#D4860A' },
  notes: { marginTop: 24, padding: 12, backgroundColor: '#fafafa', borderRadius: 6 },
  notesTitle: { fontSize: 8, fontWeight: 'bold', color: '#888', textTransform: 'uppercase', marginBottom: 4 },
  notesText: { fontSize: 9, color: '#555', lineHeight: 1.5 },
  signArea: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 40 },
  signBox: { width: 160, alignItems: 'center' },
  signLine: { height: 1, backgroundColor: '#111', width: '100%', marginTop: 48, marginBottom: 4 },
  signLabel: { fontSize: 8, color: '#888' },
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#bbb' },
})

function formatRp(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID')
}

interface LineItem {
  deskripsi: string
  platform: string
  format: string
  qty: number
  harga: number
}

interface QuotationPDFProps {
  nomor: string
  tanggal: string
  berlakuHingga: string
  brandNama: string
  brandPic?: string
  workspaceName?: string
  workspaceAddress?: string
  items: LineItem[]
  subtotal: number
  diskon: number
  pajak: number
  pajakAmount: number
  total: number
  paymentTerms?: string
  catatan?: string
}

export function QuotationPDF({
  nomor, tanggal, berlakuHingga, brandNama, brandPic,
  workspaceName = 'Kanvas OS', workspaceAddress = '',
  items, subtotal, diskon, pajak, pajakAmount, total,
  paymentTerms, catatan,
}: QuotationPDFProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.accentBar} />

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.companyName}>{workspaceName}</Text>
            {workspaceAddress && <Text style={s.companyInfo}>{workspaceAddress}</Text>}
          </View>
          <View>
            <Text style={s.docTitle}>QUOTATION</Text>
            <Text style={s.docMeta}>No: {nomor}</Text>
            <Text style={s.docMeta}>Tanggal: {tanggal}</Text>
            <Text style={s.docMeta}>Berlaku hingga: {berlakuHingga}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Brand info */}
        <View style={s.brandBox}>
          <Text style={s.brandLabel}>Ditujukan kepada</Text>
          <Text style={s.brandName}>{brandNama}</Text>
          {brandPic && <Text style={{ fontSize: 9, color: '#666', marginTop: 2 }}>PIC: {brandPic}</Text>}
        </View>

        {/* Table */}
        <View style={s.tableHeader}>
          <Text style={[s.headerCell, s.col1]}>Deskripsi</Text>
          <Text style={[s.headerCell, s.col2]}>Platform</Text>
          <Text style={[s.headerCell, s.col3]}>Qty</Text>
          <Text style={[s.headerCell, s.col4]}>Harga</Text>
          <Text style={[s.headerCell, s.col5]}>Subtotal</Text>
        </View>
        {items.map((item, i) => (
          <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <View style={s.col1}>
              <Text>{item.deskripsi || '—'}</Text>
              {item.format && <Text style={{ fontSize: 8, color: '#888' }}>{item.format}</Text>}
            </View>
            <Text style={s.col2}>{item.platform || '—'}</Text>
            <Text style={s.col3}>{item.qty}</Text>
            <Text style={s.col4}>{formatRp(item.harga)}</Text>
            <Text style={s.col5}>{formatRp(item.qty * item.harga)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={s.totalsSection}>
          <View style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Subtotal</Text>
              <Text style={s.totalValue}>{formatRp(subtotal)}</Text>
            </View>
            {diskon > 0 && (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Diskon</Text>
                <Text style={s.totalValue}>- {formatRp(diskon)}</Text>
              </View>
            )}
            {pajak > 0 && (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Pajak ({pajak}%)</Text>
                <Text style={s.totalValue}>{formatRp(pajakAmount)}</Text>
              </View>
            )}
            <View style={s.grandTotalRow}>
              <Text style={s.grandLabel}>TOTAL</Text>
              <Text style={s.grandValue}>{formatRp(total)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {(paymentTerms || catatan) && (
          <View style={s.notes}>
            {paymentTerms && (
              <View style={{ marginBottom: catatan ? 8 : 0 }}>
                <Text style={s.notesTitle}>Payment Terms</Text>
                <Text style={s.notesText}>{paymentTerms}</Text>
              </View>
            )}
            {catatan && (
              <View>
                <Text style={s.notesTitle}>Catatan</Text>
                <Text style={s.notesText}>{catatan}</Text>
              </View>
            )}
          </View>
        )}

        {/* Signature */}
        <View style={s.signArea}>
          <View style={s.signBox}>
            <View style={s.signLine} />
            <Text style={s.signLabel}>{workspaceName}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>Dokumen ini dibuat secara digital oleh {workspaceName}</Text>
          <Text style={s.footerText}>{nomor}</Text>
        </View>
      </Page>
    </Document>
  )
}
