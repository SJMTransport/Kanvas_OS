# KANVAS OS — Project Context

## Identitas
- **Nama:** Kanvas OS — Creator Business Operating System
- **URL:** kanvas-os.vercel.app
- **Tujuan:** Platform manajemen konten & bisnis untuk content creator. Multi-owner, multi-workspace, multi-platform sosial media.

## Tech Stack (tidak boleh diganti)
```
Framework  : Next.js 14 App Router + TypeScript strict
UI         : Tailwind CSS v3 + shadcn/ui + Framer Motion
Database   : Supabase (PostgreSQL + Auth + Storage)
State      : Zustand (global) + React Query (server)
Forms      : React Hook Form + Zod
Icons      : Lucide React
Fonts      : Sora (heading), Inter (body), JetBrains Mono (mono)
PDF        : @react-pdf/renderer
Package    : pnpm
```

## Design System

### Colors (definisikan di tailwind.config.ts)
```
background    #FFFFFF   (dominant)
surface       #F9F9F8
subtle        #F4F5F7
border        #E8EAED
border-md     #D1D5DB
text-primary  #111827
text-secondary #6B7280
text-muted    #9CA3AF
accent        #D4860A   (amber, brand color)
accent-light  #FEF3C7
success       #16A34A
warning       #D97706
error         #DC2626
tiktok        #000000
instagram     #E1306C
youtube       #FF0000
facebook      #1877F2
```

### Rules
- White dominant, bukan dark mode
- Edge-to-edge, tidak ada card dalam card dalam card
- Border radius: rounded-lg card, rounded-md input, rounded-full badge
- Shadow: shadow-sm hanya jika perlu elevasi
- Button primary: bg-accent text-white hover:bg-[#B8720A]
- Button secondary: bg-white border border-border hover:bg-subtle

### Responsive
```
Mobile  < 768px  : Bottom nav bar, single column, bottom sheet untuk form, tap target 44×44px min
Desktop ≥ 1024px : Sidebar fixed 240px (collapsible 64px), split view dimana relevan
```

## Data Model Ringkas

```
workspaces → workspace_members (role: owner|manager|editor)
           → social_accounts (platform: tiktok|instagram|youtube|facebook)
           → videos → video_platform_schedules (jadwal per platform)
                    → scripts, shooting_checklists, editing_checklists
                    → video_performance (metrics per platform)
           → brands → brand_followups, quotations → deals → invoices
           → ideas, broll_catalog, trend_audios, research_competitors
```

## Role & Permission
```
Owner   : akses semua termasuk invoice & settings
Manager : semua kecuali invoice & workspace settings
Editor  : content & checklist saja, read-only performa
```

## Platform Colors untuk UI
TikTok = hitam, Instagram = pink #E1306C, YouTube = merah, Facebook = biru #1877F2

## Conventions
- Semua error dibungkus try/catch dengan pesan Bahasa Indonesia
- Loading state jelas untuk setiap async operation
- Toast notification untuk success/error
- Tidak ada `any` type
- Zod validation sebelum semua form submit
- Format angka: gunakan K/M (contoh: 88K, 1.2M)
- Format currency: Rupiah (Rp 1.500.000)
- Optimistic update untuk UX responsif
