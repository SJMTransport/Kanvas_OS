'use client'

import { cn } from '@/lib/utils'
import { TEMPLATES, type TemplateType } from './editor-templates'

interface Props {
  onSelect: (type: TemplateType) => void
}

export function TemplatePicker({ onSelect }: Props) {
  return (
    <div className="px-4 py-6">
      <p className="text-sm font-medium text-text-secondary mb-4">Pilih template:</p>
      <div className="grid grid-cols-3 gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.type}
            onClick={() => onSelect(t.type)}
            className={cn(
              'flex flex-col items-center gap-2 p-3 rounded-xl border border-border',
              'hover:border-amber-400 hover:bg-amber-50 transition-colors text-center',
              'focus:outline-none focus:ring-2 focus:ring-amber-400'
            )}
          >
            <span className="text-2xl">{t.emoji}</span>
            <div>
              <p className="text-xs font-medium text-text-primary">{t.label}</p>
              <p className="text-[10px] text-text-muted mt-0.5">{t.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
