'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbSegment {
  label: string
  href?: string
  onClick?: () => void
}

export function Breadcrumb({ segments, className }: { segments: BreadcrumbSegment[]; className?: string }) {
  const router = useRouter()
  return (
    <nav className={cn('flex items-center gap-1 text-[11px] text-text-muted flex-wrap', className)}>
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1
        const clickable = !isLast && (seg.href || seg.onClick)
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 text-border shrink-0" />}
            {clickable ? (
              <button
                onClick={() => (seg.onClick ? seg.onClick() : seg.href && router.push(seg.href))}
                className="hover:text-accent hover:underline font-medium"
              >
                {seg.label}
              </button>
            ) : (
              <span className={cn(isLast && 'font-semibold text-text-secondary')}>{seg.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
