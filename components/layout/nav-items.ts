import {
  LayoutDashboard, CalendarDays, Video, BarChart2,
  Handshake, Image, Settings, Lightbulb, type LucideIcon
} from 'lucide-react'

export interface NavItem {
  label: string
  href?: string
  icon: LucideIcon
  children?: { label: string; href: string }[]
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Kalender', href: '/calendar', icon: CalendarDays },
  {
    label: 'Content',
    icon: Video,
    children: [
      { label: 'Video Banking', href: '/content' },
    ],
  },
  { label: 'Performa', href: '/performance', icon: BarChart2 },
  {
    label: 'Incubator',
    icon: Lightbulb,
    children: [
      { label: 'Idea', href: '/incubator/idea' },
      { label: 'Creator', href: '/incubator/creator' },
      { label: 'Konten Disimpan', href: '/incubator/saved' },
      { label: 'Shot List', href: '/incubator/shot-list' },
    ],
  },
  {
    label: 'Brand',
    icon: Handshake,
    children: [
      { label: 'Pipeline', href: '/brand' },
      { label: 'Quotation Baru', href: '/brand/quotations/new' },
    ],
  },
  { label: 'Aset', href: '/aset', icon: Image },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export const BOTTOM_NAV: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Kalender', href: '/calendar', icon: CalendarDays },
  { label: 'Content', href: '/content', icon: Video },
  { label: 'Incubator', href: '/incubator/idea', icon: Lightbulb },
]
