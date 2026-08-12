'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useWorkspaceStore } from '@/lib/stores/workspaceStore'
import { WorkspaceSwitcher } from './workspace-switcher'
import { NAV_ITEMS } from './nav-items'
import { ChevronLeft, ChevronRight, ChevronDown, Palette } from 'lucide-react'
import { cn } from '@/lib/utils'

function SoonBadge() {
  return (
    <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-subtle text-text-muted border border-border">
      Segera
    </span>
  )
}

export const Sidebar = React.memo(function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { sidebarCollapsed, setSidebarCollapsed, currentWorkspace } = useWorkspaceStore()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  // Auto-expand the group that contains the current route so the user sees
  // where they are, without forcing every group open.
  const [expanded, setExpanded] = useState<string[]>(() =>
    NAV_ITEMS.filter((i) => i.children?.some((c) => pathname === c.href || pathname.startsWith(c.href + '/'))).map((i) => i.label)
  )

  function toggleExpand(label: string) {
    setExpanded((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    )
  }

  function handleMouseEnter(href: string) {
    // Prefetch Next.js page bundle on hover for instant navigation
    router.prefetch(href)
  }

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-white border-r border-border z-30 transition-all duration-200',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-2 px-4 h-14 border-b border-border shrink-0', sidebarCollapsed && 'justify-center px-0')}>
        <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0">
          <Palette className="w-3.5 h-3.5 text-white" />
        </div>
        {!sidebarCollapsed && (
          <span className="font-heading font-bold text-text-primary text-sm">Kanvas OS</span>
        )}
      </div>

      {/* Workspace Switcher */}
      <div className={cn('px-3 py-2 border-b border-border', sidebarCollapsed && 'flex justify-center px-2')}>
        <WorkspaceSwitcher collapsed={sidebarCollapsed} />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const hasChildren = item.children && item.children.length > 0
          const isExpanded = expanded.includes(item.label)
          const active = item.href ? isActive(item.href) : item.children?.some((c) => isActive(c.href))

          if (hasChildren && !sidebarCollapsed) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleExpand(item.label)}
                  className={cn(
                    'flex items-center gap-2.5 w-full px-2 py-2 rounded-md text-sm transition-colors',
                    active ? 'text-accent font-medium' : 'text-text-secondary hover:text-text-primary hover:bg-subtle'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', isExpanded && 'rotate-180')} />
                </button>
                {isExpanded && (
                  <div className="ml-6 mt-0.5 space-y-0.5 border-l border-border pl-3">
                    {item.children!.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onMouseEnter={() => handleMouseEnter(child.href)}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                          isActive(child.href)
                            ? 'text-accent font-medium bg-accent-light'
                            : 'text-text-secondary hover:text-text-primary hover:bg-subtle'
                        )}
                      >
                        <span className="flex-1">{child.label}</span>
                        {child.soon && <SoonBadge />}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          if (item.href) {
            return (
              <Link
                key={item.label}
                href={item.href}
                onMouseEnter={() => handleMouseEnter(item.href!)}
                className={cn(
                  'flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors',
                  sidebarCollapsed && 'justify-center px-0',
                  active ? 'text-accent font-medium bg-accent-light' : 'text-text-secondary hover:text-text-primary hover:bg-subtle'
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span className="flex-1">{item.label}</span>}
                {!sidebarCollapsed && item.soon && <SoonBadge />}
              </Link>
            )
          }

          // collapsed with children — show icon only
          return (
            <button
              key={item.label}
              className={cn(
                'flex items-center justify-center w-full px-0 py-2 rounded-md text-sm transition-colors',
                active ? 'text-accent font-medium bg-accent-light' : 'text-text-secondary hover:text-text-primary hover:bg-subtle'
              )}
              title={item.label}
            >
              <Icon className="w-4 h-4" />
            </button>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 py-2 border-t border-border">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex items-center justify-center w-full py-1.5 rounded-md text-text-muted hover:bg-subtle hover:text-text-primary transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!sidebarCollapsed && <span className="text-xs ml-1.5">Kecilkan</span>}
        </button>
      </div>
    </aside>
  )
})
