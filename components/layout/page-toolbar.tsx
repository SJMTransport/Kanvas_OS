'use client'

import * as React from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = 'Cari...',
  className,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClear?: () => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn('relative w-[288px] shrink-0', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-text-muted" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="pl-9 pr-8 h-10 text-sm rounded-[12px] border-border bg-white placeholder:text-text-muted focus:ring-2 focus:ring-[#4C9998] focus:border-transparent"
      />
      {value && (
        <button
          onClick={onClear ?? (() => onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>))}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-0.5"
          title="Hapus pencarian"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export function PageToolbar({
  children,
  left,
  center,
  right,
  className,
}: {
  children?: React.ReactNode
  left?: React.ReactNode
  center?: React.ReactNode
  right?: React.ReactNode
  className?: string
}) {
  if (children) {
    return (
      <div className={cn('grid grid-cols-[1fr_auto_1fr] items-center min-h-[56px] py-1.5 shrink-0 gap-4', className)}>
        {children}
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-[1fr_auto_1fr] items-center min-h-[56px] py-1.5 shrink-0 gap-4', className)}>
      {/* Left Zone */}
      <div className="flex items-center gap-3 justify-start min-w-0">
        {left}
      </div>

      {/* Center Zone */}
      <div className="flex items-center justify-center shrink-0">
        {center}
      </div>

      {/* Right Zone */}
      <div className="flex items-center justify-end gap-2.5 min-w-0">
        {right}
      </div>
    </div>
  )
}
