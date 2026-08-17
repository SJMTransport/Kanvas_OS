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
      <div className="bg-white border-b border-border px-6 flex items-center gap-1 shrink-0 h-[44px]">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 text-sm font-semibold border-b-2 transition-colors rounded-t-md',
                active
                  ? 'border-[#4C9998] text-[#287978] bg-[#EFF7F5]'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-subtle/50'
              )}
            >
              <tab.icon className={cn('w-4 h-4 shrink-0', active ? 'text-[#4C9998]' : 'text-text-secondary')} />
              {tab.label}
            </Link>
          )
        })}
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
