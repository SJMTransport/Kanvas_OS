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
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-4rem)] lg:h-[calc(100vh-3.5rem)]">
      {/* Vault Sub-nav */}
      <div className="bg-white border-b border-border px-4 flex items-center gap-1">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors',
                active
                  ? 'border-amber-500 text-amber-600 bg-amber-50/50'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </Link>
          )
        })}
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
