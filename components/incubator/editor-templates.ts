import type { JSONContent } from '@tiptap/react'

export type TemplateType = 'blank' | 'script' | 'rough_idea' | 'content_analysis' | 'shot_list' | 'campaign_idea'

export const TEMPLATES: { type: TemplateType; emoji: string; label: string; description: string }[] = [
  { type: 'blank', emoji: '📝', label: 'Kosong', description: 'Mulai dari awal' },
  { type: 'script', emoji: '🎬', label: 'Script Video', description: 'Hook, Body, CTA' },
  { type: 'rough_idea', emoji: '💡', label: 'Ide Kasar', description: 'Ide + Next Step' },
  { type: 'content_analysis', emoji: '🔍', label: 'Analisis Konten', description: 'Breakdown konten' },
  { type: 'shot_list', emoji: '📋', label: 'Shot List', description: 'Daftar shot produksi' },
  { type: 'campaign_idea', emoji: '🎯', label: 'Campaign Idea', description: 'Konsep & strategi' },
]

function h2(text: string): JSONContent {
  return { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] }
}
function p(text = ''): JSONContent {
  return text ? { type: 'paragraph', content: [{ type: 'text', text }] } : { type: 'paragraph' }
}
function taskItem(text = ''): JSONContent {
  return { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : undefined }] }
}

export const TEMPLATE_CONTENT: Record<TemplateType, JSONContent> = {
  blank: { type: 'doc', content: [p()] },

  script: {
    type: 'doc',
    content: [
      h2('Hook'), p(),
      h2('Body'), p(),
      h2('CTA'), p(),
      h2('Catatan untuk Editor'), p(),
    ],
  },

  rough_idea: {
    type: 'doc',
    content: [
      h2('Ide'), p(),
      h2('Kenapa Ini Menarik'), p(),
      h2('Next Step'),
      { type: 'taskList', content: [taskItem()] },
    ],
  },

  content_analysis: {
    type: 'doc',
    content: [
      h2('Yang Bagus'), p(),
      h2('Kenapa Bagus'), p(),
      h2('Adaptasi untuk Saya'), p(),
      h2('Action Item'),
      { type: 'taskList', content: [taskItem()] },
    ],
  },

  shot_list: {
    type: 'doc',
    content: [
      h2('Shot List'),
      { type: 'taskList', content: [taskItem('Shot 1: '), taskItem('Shot 2: '), taskItem('Shot 3: ')] },
      h2('Catatan Lokasi'), p(),
      h2('Equipment yang Dibutuhkan'), p(),
    ],
  },

  campaign_idea: {
    type: 'doc',
    content: [
      h2('Konsep'), p(),
      h2('Target Audiens'), p(),
      h2('Platform Utama'), p(),
      h2('Estimasi Effort'),
      p('Waktu produksi: '),
      p('Resource: '),
      h2('Brand yang Relevan'), p(),
    ],
  },
}
