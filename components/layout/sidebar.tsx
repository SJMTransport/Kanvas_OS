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
  const { sidebarCollapsed, setSidebarCollapsed } = useWorkspaceStore()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const [expanded, setExpanded] = useState<string[]>(() =>
    NAV_ITEMS.filter((i) => i.children?.some((c) => pathname === c.href || pathname.startsWith(c.href + '/'))).map((i) => i.label)
  )

  function toggleExpand(label: string) {
    setExpanded((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    )
  }

  function handleMouseEnter(href: string) {
    router.prefetch(href)
  }

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-white border-r border-border z-30 transition-[width] duration-200 ease-in-out',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-2.5 px-4 h-14 border-b border-border shrink-0', sidebarCollapsed && 'justify-center px-0')}>
        <div className="w-8 h-8 rounded-xl bg-teal-500 flex items-center justify-center shrink-0 shadow-subtle">
          <Palette className="w-4 h-4 text-white" />
        </div>
        {!sidebarCollapsed && (
          <span className="font-heading font-bold text-text-primary text-sm tracking-tight">Kanvas OS</span>
        )}
      </div>

      {/* Workspace Switcher */}
      <div className={cn('px-3 py-2.5 border-b border-border', sidebarCollapsed && 'flex justify-center px-2')}>
        <WorkspaceSwitcher collapsed={sidebarCollapsed} />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const hasChildren = item.children && item.children.length > 0
          const isExpanded = expanded.includes(item.label)
          const active = item.href ? isActive(item.href) : item.children?.some((c) => isActive(c.href))

          if (hasChildren && !sidebarCollapsed) {
            return (
              <div key={item.label} className="space-y-1">
                <button
                  onClick={() => toggleExpand(item.label)}
                  className={cn(
                    'flex items-center gap-2.5 w-full h-9 px-3 rounded-xl text-xs transition-all',
                    active ? 'text-teal-800 font-semibold bg-teal-50 shadow-subtle' : 'text-text-secondary hover:text-text-primary hover:bg-subtle'
                  )}
                >
                  <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-teal-600' : 'text-text-secondary')} />
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', isExpanded && 'rotate-180')} />
                </button>
                {isExpanded && (
                  <div className="ml-5 mt-1 space-y-1 border-l-2 border-border/60 pl-2.5">
                    {item.children!.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onMouseEnter={() => handleMouseEnter(child.href)}
                        className={cn(
                          'flex items-center gap-2 h-8 px-2.5 rounded-lg text-xs transition-all',
                          isActive(child.href)
                            ? 'text-teal-800 font-semibold bg-teal-50 shadow-subtle'
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
                  'flex items-center gap-2.5 h-9 px-3 rounded-xl text-xs transition-all',
                  sidebarCollapsed && 'justify-center px-0',
                  active ? 'text-teal-800 font-semibold bg-teal-50 shadow-subtle' : 'text-text-secondary hover:text-text-primary hover:bg-subtle'
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-teal-600' : 'text-text-secondary')} />
                {!sidebarCollapsed && <span className="flex-1 font-medium">{item.label}</span>}
                {!sidebarCollapsed && item.soon && <SoonBadge />}
              </Link>
            )
          }

          return (
            <button
              key={item.label}
              className={cn(
                'flex items-center justify-center w-full h-9 px-0 rounded-xl text-xs transition-all',
                active ? 'text-teal-800 font-semibold bg-teal-50 shadow-subtle' : 'text-text-secondary hover:text-text-primary hover:bg-subtle'
              )}
              title={item.label}
            >
              <Icon className={cn('w-4 h-4', active ? 'text-teal-600' : 'text-text-secondary')} />
            </button>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2.5 py-2.5 border-t border-border">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex items-center justify-center w-full py-1.5 rounded-xl text-text-muted hover:bg-subtle hover:text-text-primary transition-colors text-xs"
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!sidebarCollapsed && <span className="ml-1.5 font-medium">Kecilkan</span>}
        </button>
      </div>
    </aside>
  )
})
