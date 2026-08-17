'use client'

import * as React from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TabOption<T extends string = string> {
  value: T
  label: string
  icon?: LucideIcon
}

export function SegmentedTabs<T extends string = string>({
  options,
  value,
  onChange,
  className,
}: {
  options: TabOption<T>[]
  value: T
  onChange: (val: T) => void
  className?: string
}) {
  return (
    <div className={cn('inline-flex h-10 items-center justify-center rounded-[12px] bg-[#EFF7F5] p-1 border border-border/80 shrink-0', className)}>
      {options.map((opt) => {
        const Icon = opt.icon
        const isActive = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-[8px] text-[13px] font-medium transition-all shrink-0',
              isActive
                ? 'bg-white text-[#287978] font-semibold shadow-subtle'
                : 'text-text-secondary hover:text-text-primary hover:bg-white/60'
            )}
          >
            {Icon && <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-[#4C9998]' : 'text-text-secondary')} />}
            <span>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
