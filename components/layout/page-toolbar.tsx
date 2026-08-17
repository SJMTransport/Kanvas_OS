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
    <div className={cn('relative w-72 shrink-0', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="pl-9 pr-8 h-10 text-xs rounded-md border-border bg-white placeholder:text-text-muted focus:ring-teal-500"
      />
      {value && (
        <button
          onClick={onClear ?? (() => onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>))}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-0.5"
          title="Hapus pencarian"
        >
          <X className="w-3.5 h-3.5" />
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
      <div className={cn('bg-white border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shrink-0 min-h-[56px]', className)}>
        {children}
      </div>
    )
  }

  return (
    <div className={cn('bg-white border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shrink-0 min-h-[56px]', className)}>
      {/* Left Zone */}
      <div className="flex items-center gap-3 shrink-0">
        {left}
      </div>

      {/* Center Zone */}
      <div className="flex items-center justify-center shrink-0">
        {center}
      </div>

      {/* Right Zone */}
      <div className="flex items-center justify-end gap-2.5 shrink-0">
        {right}
      </div>
    </div>
  )
}
