'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { BOTTOM_NAV, NAV_ITEMS } from './nav-items'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-border z-30 flex items-center h-16 px-2 safe-area-bottom">
      {BOTTOM_NAV.map((item) => {
        const Icon = item.icon
        const active = item.href ? isActive(item.href) : false
        return (
          <Link
            key={item.label}
            href={item.href!}
            className={cn(
              'flex flex-col items-center justify-center flex-1 gap-0.5 py-1 rounded-lg transition-colors min-h-[44px]',
              active ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] leading-none">{item.label}</span>
          </Link>
        )
      })}

      {/* More sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <button className="flex flex-col items-center justify-center flex-1 gap-0.5 py-1 rounded-lg text-text-muted hover:text-text-secondary transition-colors min-h-[44px]">
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] leading-none">Lainnya</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="py-2 space-y-1 px-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              if (item.children) {
                return (
                  <div key={item.label}>
                    <p className="px-3 py-1 text-xs font-semibold text-text-muted uppercase tracking-wider">{item.label}</p>
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors min-h-[44px]',
                          isActive(child.href) ? 'bg-accent-light text-accent font-medium' : 'text-text-secondary hover:bg-subtle'
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )
              }
              return (
                <Link
                  key={item.label}
                  href={item.href!}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors min-h-[44px]',
                    isActive(item.href!) ? 'bg-accent-light text-accent font-medium' : 'text-text-secondary hover:bg-subtle'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  )
}
