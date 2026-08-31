// Indonesian number-to-words, for Quotation/Invoice "Terbilang" lines.
// Handles non-negative integers up to triliun. Rounds to the nearest whole
// rupiah — Indonesian invoices don't carry sen/decimals in practice.

const SATUAN = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan']

function threeDigits(n: number): string {
  if (n === 0) return ''
  if (n < 10) return SATUAN[n]
  if (n < 20) return n === 10 ? 'Sepuluh' : n === 11 ? 'Sebelas' : `${SATUAN[n - 10]} Belas`
  if (n < 100) {
    const puluh = Math.floor(n / 10)
    const sisa = n % 10
    return `${SATUAN[puluh]} Puluh${sisa ? ' ' + SATUAN[sisa] : ''}`
  }
  const ratus = Math.floor(n / 100)
  const sisa = n % 100
  const ratusStr = ratus === 1 ? 'Seratus' : `${SATUAN[ratus]} Ratus`
  return `${ratusStr}${sisa ? ' ' + threeDigits(sisa) : ''}`
}

/** Converts a non-negative integer to Indonesian words (no "Rupiah" suffix). */
export function angkaKeTerbilang(value: number): string {
  const n = Math.round(Math.abs(value))
  if (n === 0) return 'Nol'

  const groups: number[] = []
  let rest = n
  while (rest > 0) {
    groups.push(rest % 1000)
    rest = Math.floor(rest / 1000)
  }

  const scale = ['', 'Ribu', 'Juta', 'Miliar', 'Triliun']
  const parts: string[] = []
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i]
    if (g === 0) continue
    if (i === 1 && g === 1) {
      parts.push('Seribu')
      continue
    }
    parts.push(`${threeDigits(g)}${scale[i] ? ' ' + scale[i] : ''}`)
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

/** "Terbilang" line for money — e.g. "Dua Belas Juta Rupiah". */
export function terbilangRupiah(value: number): string {
  const words = angkaKeTerbilang(value)
  return `${words} Rupiah`
}
