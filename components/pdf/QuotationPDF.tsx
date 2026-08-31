import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { terbilangRupiah } from '@/lib/utils/terbilang'

// No Font.register() here on purpose — the previous version registered a
// remote Google Fonts URL fetched at render time in the browser. If that
// fetch fails (network policy, offline, rate limit) @react-pdf/renderer
// throws, and the calling page's catch block showed only a generic
// "Gagal generate PDF" with no console.error — that was the actual root
// cause of the bug this file was rewritten to fix. Helvetica is one of
// the 14 standard PDF fonts built into every PDF viewer; it needs no
// network fetch and matches the plain, document-like look requested.

const s = StyleSheet.create({
  page: { padding: 48, fontSize: 10, color: '#1a1a1a', lineHeight: 1.4 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  toBlock: { maxWidth: 260 },
  label: { fontSize: 9, color: '#666', marginBottom: 2 },
  recipientName: { fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
  recipientLine: { fontSize: 10, color: '#333' },
  metaBlock: { alignItems: 'flex-end' },
  metaLine: { fontSize: 10, marginBottom: 2 },
  table: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#1a1a1a' },
  tableHeadRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a1a1a', paddingVertical: 5 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#ccc', paddingVertical: 6 },
  th: { fontSize: 9, fontWeight: 'bold' },
  colDesc: { flex: 4, paddingRight: 8 },
  colPrice: { flex: 1.3, textAlign: 'right' },
  colQty: { flex: 0.8, textAlign: 'center' },
  colTotal: { flex: 1.3, textAlign: 'right' },
  descLine: { fontSize: 9.5 },
  bonusTag: { fontSize: 8, color: '#666', fontStyle: 'italic' },
  totalsBlock: { marginTop: 12, alignItems: 'flex-end' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', width: 220, borderTopWidth: 1, borderTopColor: '#1a1a1a', paddingTop: 6, marginTop: 4 },
  grandLabel: { fontSize: 11, fontWeight: 'bold' },
  grandValue: { fontSize: 11, fontWeight: 'bold' },
  terbilang: { fontSize: 9.5, color: '#333', marginTop: 4, textAlign: 'right', width: 260, alignSelf: 'flex-end' },
  section: { marginTop: 20 },
  sectionLabel: { fontSize: 9, color: '#666', marginBottom: 3 },
  sectionText: { fontSize: 9.5, color: '#333' },
  paymentRow: { flexDirection: 'row', marginTop: 2 },
  paymentLabel: { fontSize: 9.5, width: 100 },
  paymentValue: { fontSize: 9.5, fontWeight: 'bold' },
  signatureBlock: { marginTop: 36 },
  signatureLine: { fontSize: 9.5, marginBottom: 40 },
  signatureName: { fontSize: 9.5, fontWeight: 'bold' },
})

function formatRp(n: number): string {
  return 'Rp' + Math.round(n).toLocaleString('id-ID')
}

export interface DocLineItem {
  description: string
  price: number
  qty: number
  is_bonus?: boolean
}

interface QuotationPDFProps {
  quotationNumber: string
  tanggal: string
  expiredDate?: string
  recipientName: string
  recipientAddress?: string
  items: DocLineItem[]
  notes?: string
  bankName?: string
  accountNumber?: string
  accountHolder?: string
  signatoryName?: string
}

export function QuotationPDF({
  quotationNumber, tanggal, expiredDate,
  recipientName, recipientAddress,
  items, notes,
  bankName, accountNumber, accountHolder,
  signatoryName,
}: QuotationPDFProps) {
  const total = items.filter((it) => !it.is_bonus).reduce((sum, it) => sum + it.price * it.qty, 0)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>Quotation</Text>

        <View style={s.metaRow}>
          <View style={s.toBlock}>
            <Text style={s.label}>To:</Text>
            <Text style={s.recipientName}>{recipientName}</Text>
            {recipientAddress && <Text style={s.recipientLine}>{recipientAddress}</Text>}
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaLine}>No: {quotationNumber}</Text>
            <Text style={s.metaLine}>{tanggal}</Text>
            {expiredDate && <Text style={[s.metaLine, { fontSize: 9, color: '#666' }]}>Berlaku hingga {expiredDate}</Text>}
          </View>
        </View>

        <View style={s.table}>
          <View style={s.tableHeadRow}>
            <Text style={[s.th, s.colDesc]}>Deskripsi</Text>
            <Text style={[s.th, s.colPrice]}>Harga</Text>
            <Text style={[s.th, s.colQty]}>Jumlah</Text>
            <Text style={[s.th, s.colTotal]}>Total</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={s.tableRow}>
              <View style={s.colDesc}>
                {item.description.split('\n').map((line, li) => (
                  <Text key={li} style={s.descLine}>{line}</Text>
                ))}
                {item.is_bonus && <Text style={s.bonusTag}>Bonus</Text>}
              </View>
              <Text style={[s.descLine, s.colPrice]}>{item.price > 0 ? formatRp(item.price) : '—'}</Text>
              <Text style={[s.descLine, s.colQty]}>{item.qty}</Text>
              <Text style={[s.descLine, s.colTotal]}>{item.is_bonus ? 'Bonus' : formatRp(item.price * item.qty)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totalsBlock}>
          <View style={s.grandTotalRow}>
            <Text style={s.grandLabel}>Total</Text>
            <Text style={s.grandValue}>{formatRp(total)}</Text>
          </View>
          <Text style={s.terbilang}>Terbilang: {terbilangRupiah(total)}</Text>
        </View>

        {notes && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Ket:</Text>
            <Text style={s.sectionText}>{notes}</Text>
          </View>
        )}

        {(bankName || accountNumber || accountHolder) && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Detail pembayaran:</Text>
            {bankName && <View style={s.paymentRow}><Text style={s.paymentLabel}>Bank</Text><Text style={s.paymentValue}>{bankName}</Text></View>}
            {accountNumber && <View style={s.paymentRow}><Text style={s.paymentLabel}>Nomor Rekening</Text><Text style={s.paymentValue}>{accountNumber}</Text></View>}
            {accountHolder && <View style={s.paymentRow}><Text style={s.paymentLabel}>A/n</Text><Text style={s.paymentValue}>{accountHolder}</Text></View>}
          </View>
        )}

        <View style={s.signatureBlock}>
          <Text style={s.signatureLine}>Hormat Kami,</Text>
          {signatoryName && <Text style={s.signatureName}>({signatoryName})</Text>}
        </View>
      </Page>
    </Document>
  )
}
