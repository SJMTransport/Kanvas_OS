'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Lightbulb, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Idea', href: '/incubator/idea', icon: Lightbulb },
  { label: 'Creator', href: '/incubator/creator', icon: Users },
]

export default function IncubatorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-4rem)] lg:h-[calc(100vh-3.5rem)]">
      {/* Sub-nav */}
      <div className="bg-white border-b border-border px-4 flex items-center gap-1">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors',
                active
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Link>
          )
        })}
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
