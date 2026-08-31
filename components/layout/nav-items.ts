import {
  LayoutDashboard, Video, Handshake, Image, Settings, Lightbulb, FolderOpen,
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

// Streamlined, 5-destination top-level navigation:
// 1. Dashboard  (/dashboard)
// 2. Konten     (/content)  -- views: Tabel, Kanban, Kalender, Performa
// 3. Karya      (/works)    -- projects / campaigns / endeavors
// 4. Vault      (/incubator/idea) -- Ide, Referensi, Creator, Shot List
// 5. Brand      (/brand)    -- Client CRM, Deals, Proposals, Invoices
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Konten', href: '/content', icon: Video },
  { label: 'Karya', href: '/works', icon: FolderOpen },
  {
    label: 'Vault',
    icon: Lightbulb,
    children: [
      { label: 'Ide', href: '/incubator/idea' },
      { label: 'Referensi', href: '/incubator/saved' },
      { label: 'Creator', href: '/incubator/creator' },
      { label: 'Shot List', href: '/incubator/shot-list' },
    ],
  },
  { label: 'Brand', href: '/brand', icon: Handshake },
  { label: 'Aset', href: '/aset', icon: Image, soon: true },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export const BOTTOM_NAV: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Konten', href: '/content', icon: Video },
  { label: 'Karya', href: '/works', icon: FolderOpen },
  { label: 'Vault', href: '/incubator/idea', icon: Lightbulb },
]
