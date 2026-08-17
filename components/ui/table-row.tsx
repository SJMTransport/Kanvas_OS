'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface WorkspaceTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLTableRowElement>) => void
  className?: string
  isDragging?: boolean
}

export function WorkspaceTableRow({
  children,
  onClick,
  className,
  isDragging,
  ...props
}: WorkspaceTableRowProps) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'h-[52px] min-h-[52px] border-b border-[#E8EEEC] hover:bg-[#EFF7F5] transition-colors cursor-pointer',
        isDragging && 'opacity-50 bg-[#EFF7F5]',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  )
}

export function WorkspaceTableCell({
  children,
  className,
  align = 'left',
  onClick,
  ...props
}: {
  children: React.ReactNode
  className?: string
  align?: 'left' | 'center' | 'right'
  onClick?: (e: React.MouseEvent<HTMLTableCellElement>) => void
} & React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      onClick={onClick}
      className={cn(
        'px-[14px] py-3 text-xs text-text-primary align-middle',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
      {...props}
    >
      {children}
    </td>
  )
}

export function WorkspaceTableHeaderCell({
  children,
  className,
  align = 'left',
  onClick,
  ...props
}: {
  children?: React.ReactNode
  className?: string
  align?: 'left' | 'center' | 'right'
  onClick?: (e: React.MouseEvent<HTMLTableCellElement>) => void
} & React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      onClick={onClick}
      className={cn(
        'h-10 px-[14px] py-2 text-xs font-semibold text-text-secondary bg-[#F7FAF9] border-b border-[#E8EEEC] text-left align-middle shrink-0',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
      {...props}
    >
      {children}
    </th>
  )
}
