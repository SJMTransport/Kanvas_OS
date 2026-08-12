import {
  LayoutDashboard, Video, Handshake, Image, Settings, Lightbulb, CalendarDays,
  type LucideIcon,
} from 'lucide-react'

export interface NavChild {
  label: string
  href: string
  soon?: boolean
}

export interface NavItem {
  label: string
  href?: string
  icon: LucideIcon
  soon?: boolean
  children?: NavChild[]
}

// Compact, grouped navigation. Six top-level entries:
// Dashboard · Konten · Incubator · Brand · Aset · Settings.
// Calendar & Performa live under Konten (they're part of the content flow);
// Karya & Lokasi live under Incubator (knowledge/support entities).
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Konten',
    icon: Video,
    children: [
      { label: 'Video Banking', href: '/content' },
      { label: 'Kalender', href: '/calendar' },
      { label: 'Performa', href: '/performance' },
    ],
  },
  {
    label: 'Incubator',
    icon: Lightbulb,
    children: [
      { label: 'Ide', href: '/incubator/idea' },
      { label: 'Referensi', href: '/incubator/saved' },
      { label: 'Creator', href: '/incubator/creator' },
      { label: 'Shot List', href: '/incubator/shot-list' },
      { label: 'Karya', href: '/works' },
      { label: 'Lokasi', href: '/locations' },
    ],
  },
  { label: 'Brand', href: '/brand', icon: Handshake },
  { label: 'Aset', href: '/aset', icon: Image, soon: true },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export const BOTTOM_NAV: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Kalender', href: '/calendar', icon: CalendarDays },
  { label: 'Content', href: '/content', icon: Video },
  { label: 'Incubator', href: '/incubator/idea', icon: Lightbulb },
]
