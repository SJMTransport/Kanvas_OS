# SJM Flow 5.0 — UI/UX Design System
> Source of truth untuk semua keputusan desain di SJM Flow 5.0
> Wajib dibaca sebelum membuat atau mengubah komponen apapun
> Konsistensi adalah prioritas utama — jangan sok ide
> Last updated: 2026-06-22
> Referensi visual: SJM Flow 5.0 UI/UX Design System (Juni 2026)

---

## PRINSIP DESAIN

- **Operational** — Fokus pada data & aksi
- **Calm · Structured** — Profesional · Master · Trustworthy · Clean · Calm · Focused
- **Consistent** — Komponen konsisten di seluruh sistem
- **Accessible** — Mudah digunakan di desktop & mobile
- **Design for Impact** — Fokus pada efisiensi operasional harian dan membuat keputusan yang tepat, lebih cepat

**Platform:** Web Desktop First · Responsive · Mobile Ready

---

## 01. WARNA

### Primary

```
#FF6A00 → #FF6433 → #FF4466 → #FFD0CC
```

Token CSS:
```css
--color-primary:        #EB5E28;
--color-primary-hover:  #D4531F;
--color-primary-light:  #FEF0E8;
--color-primary-border: #FCDAC8;
```

### Neutral

```
#111827 → #374151 → #6B7280 → #9CA3AF → #E5E7EB → #F5F6FB → #FFFFFF
```

Token CSS:
```css
--color-bg:                #F5F4F1;
--color-surface:           #FFFFFF;
--color-surface-hover:     #FAF8F5;
--color-surface-secondary: #F8F6F3;
--color-text-primary:      #1A1A1A;
--color-text-secondary:    #52504A;
--color-text-tertiary:     #9B9690;
--color-text-disabled:     #C0B8B0;
--color-border:            #E2DDD6;
--color-border-strong:     #C0B8B0;
--color-border-subtle:     #F0EBE4;
```

### Semantic

```css
--color-success:        #16A34A;
--color-success-light:  #DCFCE7;
--color-warning:        #F59E0B;
--color-warning-light:  #FEF3C7;
--color-danger:         #EF4444;
--color-danger-light:   #FEE2E2;
--color-info:           #3B80F6;
--color-info-light:     #DBEAFE;
--color-purple:         #8B00F6;
--color-purple-light:   #F3E8FF;
```

### Aturan Warna

- **JANGAN** hardcode hex di komponen — selalu pakai CSS variables
- **JANGAN** pakai Tailwind utility color (`text-red-500`, `bg-green-500`)
- Warna primary hanya untuk **satu CTA utama per halaman**
- Background card selalu `--color-surface` (putih)
- Warna semantik hanya untuk status/badge/feedback

---

## 02. TIPOGRAFI

**Font:** Inter (Sans Serif)

| Style | Size / Line | Weight | Penggunaan |
|---|---|---|---|
| Display 1 | 32px / 40px | 700 | Untuk judul halaman besar |
| Display 2 | 24px / 32px | 600 | Untuk section besar |
| Heading 1 | 20px / 28px | 600 | Untuk judul section |
| Heading 2 | 16px / 24px | 600 | Untuk sub judul |
| Body Large | 15px / 20px | 500 | Untuk body penting |
| Body Regular | 14px / 20px | 400 | Untuk body normal |
| Body Small | 12px / 16px | 400 | Untuk informasi tambahan |
| Caption | 11px / 16px | 400 | Untuk catatan kecil |

### Aturan Typography

- **JANGAN** `text-sm`, `text-xs`, `text-base` — selalu pixel eksplisit
- Angka selalu `font-variant-numeric: tabular-nums`
- Nomor referensi (SO, Invoice) pakai font-mono + warna primary
- Teks panjang di tabel: `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`
- Teks yang di-truncate WAJIB punya `title` attribute untuk tooltip

---

## 03. ICON

**Style:** Outline  
**Stroke:** 2px  
**Corner:** Rounded  
**Library:** @phosphor-icons/react  

```tsx
// Semua icon gunakan weight="regular" (outline style)
import { House, GridFour, Truck } from '@phosphor-icons/react';
<Truck size={20} />
```

**Ukuran standar:**
```
16px → icon dalam badge, label kecil
20px → icon dalam nav item, tabel
24px → icon dalam KPI card, button
32px → icon dalam card hero
```

**Icon per menu:**
```
Dashboard      → SquaresFour
Sales Order    → ClipboardText
Update Muatan  → Truck
Quotation      → FileText
Invoice        → Receipt
Jurnal Umum    → BookOpen
Hutang & Piutang → Scales
Laporan        → ChartBar
Armada         → Van
Master         → Gear
Users          → Users
Keluar         → SignOut
```

---

## 04. BUTTON

### Primary Button

```css
background: var(--color-primary);   /* #EB5E28 */
color: white;
padding: 8px 16px;   /* Large: 10px 24px, Medium: 8px 16px, Small: 6px 12px */
border-radius: 8px;
font-size: 14px;
font-weight: 500;
border: none;
cursor: pointer;
transition: background 150ms ease;
```

```
Large:  padding 10px 24px, height 44px
Medium: padding 8px 16px, height 36px
Small:  padding 6px 12px, height 32px
```

**States:**
```css
/* Hover */
background: var(--color-primary-hover);

/* Disabled */
opacity: 0.4;
cursor: not-allowed;
```

### Secondary Button

```css
background: white;
color: var(--color-text-primary);
border: 1px solid var(--color-border);
padding: 8px 16px;
border-radius: 8px;
font-size: 14px;
font-weight: 500;
cursor: pointer;

/* Hover */
background: var(--color-surface-hover);
border-color: var(--color-border-strong);
```

### Tertiary (Text) Button

```css
background: transparent;
color: var(--color-primary);
border: none;
padding: 8px 12px;
font-size: 14px;
font-weight: 500;
cursor: pointer;

/* Hover */
background: var(--color-primary-light);
```

### Danger Button

```css
background: var(--color-danger);
color: white;
border: none;
padding: 8px 16px;
border-radius: 8px;

/* Hover */
background: #DC2626;
```

---

## 05. INPUT

### Default Input

```css
height: 40px;
border: 1px solid var(--color-border);
border-radius: 8px;
padding: 0 12px;
font-size: 14px;
background: white;
color: var(--color-text-primary);
transition: border-color 150ms ease;

/* Placeholder */
color: var(--color-text-tertiary);

/* Focus */
border-color: var(--color-primary);
outline: none;
box-shadow: 0 0 0 3px var(--color-primary-light);

/* Disabled */
background: var(--color-surface-secondary);
opacity: 0.6;
cursor: not-allowed;
```

### Select (Dropdown)

```css
height: 40px;
border: 1px solid var(--color-border);
border-radius: 8px;
padding: 0 36px 0 12px;   /* ruang untuk chevron kanan */
font-size: 14px;
background: white;
appearance: none;
cursor: pointer;
```

### Date Picker

Gunakan native `<input type="date">` dengan styling custom atau komponen DatePicker.

```css
height: 40px;
border: 1px solid var(--color-border);
border-radius: 8px;
padding: 0 12px;
font-size: 14px;
```

### Search Input

```css
height: 40px;
border: 1px solid var(--color-border);
border-radius: 8px;
padding: 0 40px 0 12px;   /* ruang untuk icon kaca */
font-size: 14px;
background: var(--color-surface-secondary);
```

### Textarea

```css
border: 1px solid var(--color-border);
border-radius: 8px;
padding: 10px 12px;
font-size: 14px;
resize: vertical;
min-height: 80px;
```

### Label

```css
font-size: 14px;
font-weight: 500;
color: var(--color-text-secondary);
margin-bottom: 6px;
display: block;
```

---

## 06. STATUS / BADGE

### Status Shipment

```css
/* Base badge */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}
```

| Status | Background | Text |
|---|---|---|
| Loading | #FEF3C7 | #D97706 |
| On Going | #DBEAFE | #2563EB |
| Arrived | #E0E7FF | #4F46E5 |
| Completed | #DCFCE7 | #16A34A |
| Cancelled | #FEE2E2 | #DC2626 |

### Status Invoice

| Status | Background | Text |
|---|---|---|
| Draft | #F3F4F6 | #6B7280 |
| Issued | #DBEAFE | #2563EB |
| Partial Paid | #FEF3C7 | #D97706 |
| Paid | #DCFCE7 | #16A34A |
| Overdue | #FEE2E2 | #DC2626 |

### Status SO

| Status | Background | Text |
|---|---|---|
| Draft | #F3F4F6 | #6B7280 |
| Confirmed | #DBEAFE | #2563EB |
| Loading | #FEF3C7 | #D97706 |
| On Going | #E0E7FF | #4F46E5 |
| Arrived | #F3E8FF | #7C3AED |
| Completed | #DCFCE7 | #16A34A |
| Cancelled | #FEE2E2 | #DC2626 |

---

## 07. KARTU (CARD)

### Card Standar

```css
background: white;
border: 1px solid var(--color-border);
border-radius: 12px;
padding: 16px;
```

### Card dengan Status

Card punya border-left 4px berwarna sesuai status:
```css
border-left: 4px solid [warna-status];
border-radius: 0 12px 12px 0;
```

### Card dengan Aksi

Tambahkan chevron `>` di kanan bawah, klik seluruh card bisa navigate.

### Card Stat (mini)

```
┌─────────────────────────┐
│ [Icon 32px]  Card Title │
│              Deskripsi  │
│              singkat    │
│                       > │
└─────────────────────────┘
```

---

## 08. KPI CARD PATTERN

### Layout — Horizontal

```
┌──────────────────────────────────────────────────┐
│ [Icon 48px]   Label / Judul              [>]     │
│               Value (angka/nominal)              │
└──────────────────────────────────────────────────┘
```

```css
/* Container */
.kpi-card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 150ms ease;
}
.kpi-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(235, 94, 40, 0.08);
}

/* Icon container */
.kpi-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Content */
.kpi-content {
  flex: 1;
  min-width: 0;
}

.kpi-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.kpi-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

/* Untuk nilai Rupiah */
.kpi-value-currency {
  font-size: 22px;
  font-weight: 700;
}

/* Chevron */
.kpi-chevron {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}
```

### KPI Row 1 — Operasional (semua role)

```
SO Aktif:
  Icon: Truck, bg #DBEAFE (biru muda), icon color #2563EB
  Value: jumlah SO On Going + Loading + Arrived
  Label: "SO Aktif"

Menunggu Konfirmasi:
  Icon: Clock, bg #FEF3C7 (kuning muda), icon color #D97706
  Value: jumlah SO Order Confirmed
  Label: "Menunggu Konfirmasi"

Tidak Update >12 Jam:
  Icon: Warning, bg #FEE2E2 (merah muda), icon color #DC2626
  Value: jumlah SO aktif tanpa update >12 jam
  Label: "Tidak Ada Update >12 Jam"
```

### KPI Row 2 — Keuangan (Admin + Keuangan saja)

```
Revenue Bulan Ini:
  Icon: ChartLine, bg #DCFCE7 (hijau muda), icon color #16A34A
  Value: format "Rp 304.522.799" — gunakan fmtShort untuk nilai besar
  Label: "Revenue Bulan Ini"

Invoice Belum Lunas:
  Icon: Receipt, bg #FEE2E2 (merah muda), icon color #DC2626
  Value: jumlah invoice
  Label: "Invoice Belum Lunas"

SO Belum Diinvoice:
  Icon: ClipboardText, bg #FEF3C7 (kuning muda), icon color #D97706
  Value: jumlah SO Completed + invoice_count = 0
  Label: "SO Belum Diinvoice"
```

---

## 09. TABLE

### Struktur

```css
/* Container */
.table-container {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Toolbar */
.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

/* Scroll area */
.table-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
}

/* Table */
table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}

/* Header */
thead {
  position: sticky;
  top: 0;
  background: var(--color-surface-secondary);
  z-index: 1;
}

th {
  padding: 10px 16px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-tertiary);
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid var(--color-border);
}

/* Sort indicator */
th.sortable {
  cursor: pointer;
  user-select: none;
}
th.sortable::after {
  content: ' ↕';
  color: var(--color-text-disabled);
}
th.sort-asc::after { content: ' ↑'; color: var(--color-primary); }
th.sort-desc::after { content: ' ↓'; color: var(--color-primary); }

/* Body */
td {
  padding: 12px 16px;
  font-size: 14px;
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border-subtle);
  vertical-align: middle;
}

tr:hover td {
  background: var(--color-surface-hover);
}

tr:last-child td {
  border-bottom: none;
}

/* Checkbox kolom */
td.col-check, th.col-check {
  width: 48px;
  text-align: center;
}

/* Action kolom */
td.col-action, th.col-action {
  width: 48px;
  text-align: center;
}

/* Footer */
.table-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}
```

### Pagination — Number Based

```
< Prev  [1] [2] [3] ... [50]  Next >

Info: "Menampilkan 1 - 8 dari 399 data"
```

```css
/* Pagination container */
.pagination {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Page button */
.page-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: white;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Active page */
.page-btn.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
  font-weight: 600;
}

/* Ellipsis */
.page-ellipsis {
  padding: 0 4px;
  color: var(--color-text-tertiary);
}
```

### Kolom Dashboard Shipment Aktif

| Kolom | Width | Format |
|---|---|---|
| Checkbox | 48px | — |
| No SO | 130px | mono orange, link |
| Tanggal | 100px | 15 Jun 2026 |
| Customer | 160px | truncate + tooltip |
| Rute | 160px | Asal → Tujuan |
| Sopir & Armada | 160px | 2 baris: nama / plat · jenis |
| Nilai | 120px | Rp format, right |
| Status | 120px | badge |
| Aksi | 48px | ⋯ menu |

---

## 10. GLOBAL FILTER PATTERN

```
Layout: horizontal row
Gap: 8px
Padding: 12px 24px
```

**Urutan dari kiri:**
```
[🔍 Search — min 200px]  [Status ▾]  [Periode: 1 Jun - 30 Jun ▾]  [Filter Lainnya ▾]  [Export ▾]
```

```css
/* Filter bar */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  flex-shrink: 0;
}

/* Active filter chip */
.filter-chip {
  background: var(--color-primary-light);
  color: var(--color-primary);
  border: 1px solid var(--color-primary-border);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}
```

---

## 11. DATE PICKER PATTERN

Date picker menampilkan preset range:

```
Preset options (dari atas):
  Hari Ini
  Kemarin
  Minggu Ini
  Bulan Ini      ← default
  Tahun Ini
  7 Hari Terakhir
  30 Hari Terakhir
  90 Hari Terakhir
  Custom Range

Tampilan kalender: bulan berjalan
[Batal]  [Terapkan]
```

---

## 12. SIDEBAR PATTERN

### Expanded (220px)

```
┌─────────────────────┐
│ [Logo SJM Flow]  [«]│  ← toggle collapse
├─────────────────────┤
│ 🔲 Dashboard        │  ← active: orange bg
├─────────────────────┤
│ OPERASIONAL    [12] │  ← group dengan badge
│   📋 Sales Order    │
│   🚛 Update Muatan  │
│   📄 Quotation      │
├─────────────────────┤
│ KEUANGAN       [4 >]│
│   🧾 Invoice        │
│   📒 Jurnal Umum    │
│   ⚖️ Hutang & Piutang│
│   📊 Laporan        │
├─────────────────────┤
│ ARMADA         [2 >]│
│   🚛 Armada         │
├─────────────────────┤
│ SISTEM              │
│   ⚙️ Master         │
│   👥 Users          │
├─────────────────────┤
│ [→ Keluar]          │
└─────────────────────┘
```

### Collapsed (64px)

Hanya tampil icon saja, tidak ada teks:
```
[S]  ← logo kecil
[🔲] ← Dashboard icon
[📋] ← Operasional group icon + badge
[💰] ← Keuangan group icon + badge
[🚛] ← Armada group icon + badge
[⚙️] ← Sistem group icon
[→]  ← Keluar icon
```

### Accordion Open (satu group expand)

Saat hover/klik group di collapsed mode, tampil flyout menu:
```
[📋 Operasional] →  ┌──────────────────┐
                    │ Sales Order      │
                    │ Update Muatan    │
                    │ Quotation        │
                    └──────────────────┘
```

### Active Menu State

```css
.nav-item.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
  border-left: 3px solid var(--color-primary);
}
```

### CSS Sidebar

```css
.sidebar {
  width: 220px;
  background: white;
  border-right: 1px solid var(--color-border);
  height: 100vh;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 200ms ease;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 64px;
}

.sidebar-logo {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.nav-section-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--color-text-tertiary);
}

.nav-section-badge {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 10px;
  font-weight: 700;
  border-radius: 10px;
  padding: 2px 6px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  margin: 1px 8px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 400;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all 150ms ease;
  white-space: nowrap;
}

.nav-item:hover {
  background: var(--color-surface-hover);
}

.nav-item.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
}

.sidebar-footer {
  padding: 8px;
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}
```

---

## 13. TOPBAR PATTERN

```
┌──────────────────────────────────────────────────────────────────────┐
│ [≡] [S SJM Flow] │ [🔍 Cari shipment, SO...] │ [📅 Bulan Ini ▾] [🔔³] [A Audya Pratama ▾] │
└──────────────────────────────────────────────────────────────────────┘
```

```css
.topbar {
  height: 56px;
  background: white;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 90;
  flex-shrink: 0;
}
```

**Elemen kiri ke kanan:**

1. **Toggle Sidebar** — icon hamburger `≡`, 36px, ghost button
2. **Logo** — kotak orange 32px rounded-8 + "S" bold + "SJM Flow" italic 15px
3. **Search Bar** — max 400px, height 36px, bg #F5F4F1
4. **Period Filter** — "📅 Bulan Ini | 1 Jun 2026 - 30 Jun 2026 ▾", height 36px, border
5. **Bell** — icon notifikasi dengan badge count orange
6. **User Info**:
   - Avatar: 32px circle, warna sesuai role, initial huruf pertama
   - Nama: 14px semibold, "Audya Pratama"
   - Role + Perusahaan: 11px text-secondary, "Admin · PT Sugiarto Jaya Mandiri Transport"
   - Chevron ▾

**Panel Kanan Topbar:**
```
Dispatcher Hari Ini | Aktivitas Terbaru | Action Center
```
Topbar menampilkan summary 3 panel → klik expand ke detail.

---

## 14. DASHBOARD PATTERN

### Layout — No Scroll

```
height: calc(100vh - 56px)
overflow: hidden
display: flex
flex-direction: column
padding: 20px 24px
gap: 12px
background: #F5F4F1
```

### Struktur Vertikal

```
[1] Header Row — Greeting + Quick Actions      (flex-shrink: 0)
[2] KPI Row 1 — 3 kartu Operasional           (flex-shrink: 0)
[3] KPI Row 2 — 3 kartu Keuangan              (flex-shrink: 0, hanya Admin/Keuangan)
[4] Content Row — Tabel kiri + Panel kanan    (flex: 1, overflow: hidden)
```

### [1] Header Row

```tsx
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
  <div>
    <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
      Selamat Pagi, Audya 👋
    </h1>
    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
      Ringkasan operasional hari ini
    </p>
  </div>
  <div style={{ display: 'flex', gap: 8 }}>
    <button className="btn-quick-action">+ SO Baru</button>
    <button className="btn-quick-action">+ Update Muatan</button>
    <button className="btn-quick-action">+ Invoice Baru</button>
  </div>
</div>
```

Quick action button:
```css
.btn-quick-action {
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid var(--color-border);
  background: white;
  color: var(--color-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 150ms ease;
}
.btn-quick-action:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-light);
}
```

### [2] KPI Row 1

```tsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, flexShrink: 0 }}>
  <KPICard ... />
  <KPICard ... />
  <KPICard ... />
</div>
```

### [3] KPI Row 2

Sama dengan Row 1, tampil hanya jika role Admin atau Keuangan.

### [4] Content Row

```tsx
<div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0, overflow: 'hidden' }}>
  
  {/* Tabel — kiri */}
  <div style={{ flex: 1, minWidth: 0, background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    {/* toolbar */}
    {/* table */}
    {/* pagination */}
  </div>

  {/* Panel kanan — 300px */}
  <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
    {/* Dispatcher Hari Ini */}
    {/* Aktivitas Terbaru */}
    {/* Action Center */}
  </div>

</div>
```

### Tabel — Shipment Aktif

**Toolbar:**
```
Kiri: "SHIPMENT AKTIF" label uppercase
Kanan: [Semua Status ▾] [🔽 Filter]
```

**Kolom:**
```
ORDER (130px)    — mono orange, link ke detail
TGL MUAT (100px) — sortable ↕, format "15 Jun 2026"
CUSTOMER (150px) — truncate + tooltip
RUTE (160px)     — "Asal → Tujuan"
SOPIR & ARMADA (160px) — 2 baris:
  baris 1: nama_sopir (13px normal)
  baris 2: no_polisi · jenis_truk (11px text-secondary)
STATUS (120px)   — badge
DURASI (90px)    — "2 Jam" / "1 Hari 6 Jam"
NILAI (100px)    — Rp format, right-aligned
⋮ (40px)        — action menu
```

**DURASI kalkulasi:**
```
Jika On Going/Loading: sekarang - tgl_muat
Jika Completed: tgl_bongkar - tgl_muat
Format: < 1 jam → "X Mnt", < 24 jam → "X Jam", ≥ 1 hari → "X Hari Y Jam"
```

**Pagination:**
```
< Prev  [1] [2] [3] ... [50]  Next >
Info: "Menampilkan 1 - 8 dari 399 data"
Per page: 8 rows
```

### Panel Kanan — Dispatcher Hari Ini

```css
.panel-card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 14px;
}

.panel-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--color-text-tertiary);
  margin-bottom: 12px;
}
```

Grid 2x2:
```
[🚛 0          ] [🚌 0         ]
 Shipment Hari Ini  Armada Aktif

[👥 0          ] [🧭 7         ]
 Sopir Tersedia    Dalam Perjalanan
```

Setiap cell:
```css
.dispatcher-cell {
  background: var(--color-surface-secondary);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dispatcher-icon {
  font-size: 18px;
  margin-bottom: 4px;
}
.dispatcher-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
}
.dispatcher-label {
  font-size: 11px;
  color: var(--color-text-secondary);
}
```

### Panel Kanan — Aktivitas Terbaru

5 item timeline dari posisi_log SO aktif, terbaru di atas.

```
10:45 [🟠] SJM.ID-0394.26 dibuat      [On Going]
            oleh Endang
09:30 [🟢] Update muatan SJM.ID-0395.26 [On Going]
            Marunda → Solok Selatan
08:15 [🟡] Invoice INV/2026/0612 jatuh [Completed]
            tempo dalam 5 hari
07:20 [🔵] Shipment SJM.ID-0392.26    [On Going]
            berstatus On Going Jakarta → Jepara
06:50 [🔴] SO SJM.ID-0388.26          [Completed]
            dibatalkan oleh Halim

[Lihat semua aktivitas >]
```

```css
.activity-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border-subtle);
}
.activity-time {
  font-size: 11px;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  margin-top: 2px;
  min-width: 36px;
}
.activity-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.activity-content {
  flex: 1;
  min-width: 0;
}
.activity-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-primary);
}
.activity-sub {
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}
.activity-badge {
  flex-shrink: 0;
  margin-top: 2px;
}

/* "Lihat semua" link */
.activity-see-all {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--color-surface-secondary);
  border-radius: 8px;
  margin-top: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-primary);
  cursor: pointer;
  transition: background 150ms ease;
}
.activity-see-all:hover {
  background: var(--color-primary-light);
}
```

**Tipe aksi dan warna icon:**
```
Dibuat/Baru   → orange  #EB5E28
Diupdate      → biru    #2563EB
Completed     → hijau   #16A34A
Cancelled     → merah   #DC2626
Invoice/Keu   → kuning  #D97706
```

### Panel Kanan — Action Center

4 item alert, tampil hanya jika count > 0, sortir severity:

```
[🔴] 82   Sales Order masih berupa Draft      [>]
[🟠] 366  SO belum diinvoice                  [>]
[🟡] 3    Shipment tidak update >12 jam       [>]
[🔵] 5    Invoice jatuh tempo minggu ini      [>]
```

```css
.action-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: all 150ms ease;
  border-left: 3px solid transparent;
}

/* Severity colors */
.action-item.critical {
  background: #FEF2F2;
  border-left-color: #DC2626;
}
.action-item.high {
  background: #FFF7ED;
  border-left-color: #EA580C;
}
.action-item.medium {
  background: #FFFBEB;
  border-left-color: #D97706;
}
.action-item.info {
  background: #EFF6FF;
  border-left-color: #2563EB;
}

.action-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-count {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
  min-width: 28px;
}

.action-desc {
  flex: 1;
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.3;
}

.action-chevron {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}
```

---

## 15. ACTIVITY TIMELINE PATTERN

Dipakai di: Dashboard panel kanan, Log Aktivitas, SO detail.

```
[Waktu]  [Icon circle]  [Konten]          [Status badge]
10:45    🟠             SO-0394 dibuat    On Going
                        oleh Endang
09:30    🟢             Update SJM-0395   On Going
                        Marunda → Solok
```

Lihat Section 14 untuk CSS detail.

---

## 16. EMPTY STATE PATTERN

```
┌─────────────────────────────────────────┐
│                                         │
│     [Icon 40px, warna tertiary]         │
│     Belum ada Sales Order               │
│     Mulai buat Sales Order pertama.     │
│                                         │
│          [+ Buat SO Baru]               │
│                                         │
└─────────────────────────────────────────┘
```

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  flex: 1;
}
.empty-icon {
  color: var(--color-text-disabled);
  margin-bottom: 16px;
}
.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}
.empty-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 20px;
  max-width: 280px;
}
```

---

## 17. LOADING STATE PATTERN

### KPI Loading (Skeleton)

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-surface-secondary) 25%,
    #FAF8F5 50%,
    var(--color-surface-secondary) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Table Loading

Tampilkan 8 row skeleton dengan kolom sesuai tabel yang dimuat.

### Button Loading

```css
button.loading {
  opacity: 0.7;
  pointer-events: none;
  position: relative;
}
/* Spinner 14px di kiri teks */
/* Teks berubah: "Menyimpan...", "Memuat...", "Mengirim..." */
```

---

## 18. SLIDE PANEL PATTERN (DETAIL)

Muncul dari kanan saat klik row tabel.

```
┌──────────────┬────────────────────┬─────────────────────┐
│ Sidebar      │ List (menyempit)   │ Detail Slide Panel  │
│              │                    │ 480px               │
│              │                    │ ┌──────────────────┐│
│              │                    │ │ Detail Sales Order││
│              │                    │ ├──────────────────┤│
│              │                    │ │ [konten detail]  ││
│              │                    │ │                  ││
│              │                    │ │ Timeline         ││
│              │                    │ └──────────────────┘│
└──────────────┴────────────────────┴─────────────────────┘
```

```css
.slide-panel {
  width: 480px;
  height: 100%;
  background: white;
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  box-shadow: -4px 0 16px rgba(0,0,0,0.08);
}

.slide-panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.slide-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}
```

---

## 19. MODAL PATTERN

### Ukuran

```
Confirm: 400px  — konfirmasi hapus
Small:   480px  — form sederhana
Medium:  640px  — form SO, Invoice
Large:   860px  — form kompleks
XL:      1100px — detail dengan tabel
```

### Struktur

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
}

.modal-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}
```

### 3 Tipe Modal

**Confirm Modal** — "Yakin ingin menghapus data ini?"
**Delete Modal** — "Data yang dihapus tidak dapat dikembalikan."
**Approval Modal** — "Setujui Sales Order ini?"

---

## 20. MOBILE PATTERN

### Bottom Navigation (5 tab)

```
[Dashboard] [Muatan] [SO] [Invoice] [Lainnya]
```

```css
.bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: 56px;
  background: white;
  border-top: 1px solid var(--color-border);
  display: flex;
  z-index: 100;
}
.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 500;
  color: var(--color-text-tertiary);
  cursor: pointer;
}
.bottom-nav-item.active {
  color: var(--color-primary);
}
```

### Mobile Card (SO)

```
┌─────────────────────────────────────────┐
│ SJM.ID-0395.26              [On Going]  │
│ PT. Kasana Teknindo Gemilang            │
│ Marunda → Solok Selatan                 │
│ Nur Hakim · B 9231 PYW                  │
│ Update terakhir: 09:30                  │
│ [Kirim WA]          [Simpan Update]     │
└─────────────────────────────────────────┘
```

---

## 21. STATUS FLOW DIAGRAM

### Sales Order Flow

```
Draft → Confirmed → Loading → On Going → Arrived → Completed
                                                  ↘
                                               Cancelled
```

### Shipment Flow

```
Loading → On Going → Arrived → Completed
                             ↘ Cancelled
```

### Invoice Flow

```
Draft → Issued → Partial Paid → Paid
                              ↘ Overdue
```

---

## 22. SPACING SYSTEM (8px Grid)

```
Base unit: 8px

4px  → xs: gap icon-teks, padding badge
8px  → sm: gap antar elemen, padding kecil
12px → md: padding komponen
16px → lg: padding card, cell horizontal
20px → xl: padding halaman
24px → 2xl: gap section
32px → 3xl: gap section besar
40px → 4xl: —
48px → 5xl: section sangat besar
64px → 6xl: hero section
80px → 7xl: —
96px → 8xl: —
```

**Border Radius:**
```
4px  → badge kecil
8px  → button, input, nav-item
12px → card, container
16px → modal, panel
20px → modal besar
50%  → avatar, dot
```

---

## 23. ELEVATION (Z-INDEX GUIDE)

```
Dropdown / Popover   → 1000
Modal                → 2000
Slide Panel          → 3000
Notification Toast   → 4000
```

---

## 24. FORMAT DATA

### Tanggal & Waktu

```
Tanggal panjang:   15 Jun 2026
Tanggal pendek:    15/06/26  (hanya space terbatas)
Waktu:             09:30
Datetime:          15 Jun 2026, 09:30
Relatif < 24 jam:  "2 jam lalu", "30 menit lalu"
Relatif ≥ 24 jam:  tanggal eksplisit "15 Jun 2026"
```

### Angka & Mata Uang

```typescript
// Rupiah penuh — di tabel, form
fmt(27000000)          // → "Rp 27.000.000"
fmt(304522799)         // → "Rp 304.522.799"

// Rupiah disingkat — di KPI cards
fmtShort(27000000)     // → "Rp 27 Jt"
fmtShort(304522799)    // → "Rp 304,5 Jt"

// Parsing — SELALU parseNumSafe
parseNumSafe("27.000.000") // → 27000000  ✅
parseFloat("27.000.000")   // → 27         ❌ SALAH

// Angka selalu tabular-nums
font-variant-numeric: tabular-nums;
```

### Status Text — Selalu Konsisten

```
"On Going"        bukan "Dalam Perjalanan"
"Completed"       bukan "Selesai" atau "Done"
"Order Confirmed" bukan "Confirmed"
"Loading"         bukan "Muat"
"Cancelled"       bukan "Batal"
"Belum Bayar"     bukan "Unpaid"
"Lunas"           bukan "Paid"
"Draft"           bukan "draft"
```

---

## 25. INTERACTION STATES

```
Default   → tampilan normal
Hover     → bg ringan, cursor pointer, border gelap
Focus     → ring primary 3px
Active    → scale(0.98) — tombol saja
Disabled  → opacity 0.4, cursor not-allowed
Loading   → spinner + disabled + teks berubah
```

```css
transition: background 150ms ease;
transition: border-color 150ms ease;
transition: all 150ms ease;
transition: transform 100ms ease;
```

---

## 26. CHECKLIST SEBELUM COMMIT UI

### Layout
- [ ] Dashboard muat 1 layar tanpa scroll?
- [ ] `<main>` tidak punya padding yang menyebabkan overflow?
- [ ] Semua halaman: `height: calc(100vh - 56px)`, `overflow: hidden`?

### Typography
- [ ] Font size dari scale yang disetujui?
- [ ] KPI angka sesuai (Row 1: 28px, Row 2: 22px)?
- [ ] Nomor referensi: mono font + orange?
- [ ] Angka: tabular-nums?

### Color
- [ ] Semua warna dari CSS variables?
- [ ] Tidak ada hardcode hex?
- [ ] Status badge dari tabel Section 06?

### Icon
- [ ] Semua icon dari @phosphor-icons/react?
- [ ] Style outline (default, tanpa weight)?

### KPI
- [ ] Layout horizontal (icon kiri, angka kanan)?
- [ ] Semua KPI bisa diklik dan navigate?
- [ ] Row 2 hanya tampil untuk Admin/Keuangan?

### Tabel
- [ ] Header sticky?
- [ ] `table-layout: fixed` dengan width eksplisit?
- [ ] Pagination number-based?
- [ ] Empty state ada?
- [ ] Loading skeleton ada?
- [ ] Truncate + title tooltip untuk teks panjang?

### Dashboard
- [ ] Greeting + quick actions di header?
- [ ] Panel kanan: Dispatcher + Aktivitas + Action Center?
- [ ] Action Center sortir by severity?
- [ ] Kolom tabel: ORDER | TGL MUAT | CUSTOMER | RUTE | SOPIR & ARMADA | STATUS | DURASI | NILAI | ⋮?

### Sidebar
- [ ] Collapsible dengan toggle `≡` / `«`?
- [ ] Badge count di group label?
- [ ] Active state border-left orange?
- [ ] Keluar di bagian bawah?

---

## 27. ANTI-PATTERNS

```
❌ Hardcode hex di komponen
❌ Tailwind color utility (text-red-500, bg-green-500)
❌ Font size tidak dari scale
❌ Magic number spacing
❌ Icon dari lucide-react
❌ Shadow di card biasa
❌ Dashboard dengan vertical scroll
❌ p-5 atau padding di <main>
❌ KPI card layout vertikal
❌ Breadcrumb (tidak dipakai)
❌ Horizontal tabs di dalam halaman
❌ Pagination hanya Prev/Next
❌ Tabel tanpa sticky header
❌ Empty state tanpa deskripsi
❌ Loading tanpa disabled state
❌ Form submit tanpa validasi
❌ Delete tanpa konfirmasi
❌ parseFloat() untuk angka Indonesia
❌ Teks panjang tanpa title tooltip
❌ Status text tidak konsisten
❌ Kolom tabel tanpa width eksplisit
❌ Quick action lebih dari 3 per halaman
❌ Action Center tampil item dengan count = 0
❌ Panel kanan tanpa flex-shrink-0
```

---

*Dokumen ini adalah source of truth untuk semua keputusan desain SJM Flow 5.0.*
*Diupdate setiap kali ada keputusan desain baru yang disepakati.*
*Referensi visual: SJM Flow 5.0 UI/UX Design System + Mockup ChatGPT (Juni 2026).*
*Wajib dibaca Claude Code sebelum membuat atau mengubah komponen apapun.*
