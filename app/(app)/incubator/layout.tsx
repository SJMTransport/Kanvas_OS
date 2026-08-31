'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Lightbulb, Users, Bookmark, Clapperboard } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Ide', href: '/incubator/idea', icon: Lightbulb },
  { label: 'Referensi', href: '/incubator/saved', icon: Bookmark },
  { label: 'Creator', href: '/incubator/creator', icon: Users },
  { label: 'Shot List', href: '/incubator/shot-list', icon: Clapperboard },
]

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-full w-full flex flex-col overflow-hidden">{children}</div>
}
