// Core Domain Types — Creative Operating System
// These represent the new domain model entities from the architecture review.

// ─── Work ────────────────────────────────────────────────────────────────────
// A creative endeavor. The primary organizing container.
// "What are you working on?"

export interface Work {
  id: string
  workspace_id: string
  created_by: string | null
  title: string
  description: string | null
  cover_url: string | null
  created_at: string
  updated_at: string
}

export type WorkItemType = 'video' | 'idea' | 'reference' | 'location'

export interface WorkItem {
  id: string
  work_id: string
  item_type: WorkItemType
  item_id: string
  sort_order: number
  added_at: string
}

// ─── Location ────────────────────────────────────────────────────────────────
// A meaningful physical place, reusable across Works.

export interface Location {
  id: string
  workspace_id: string
  created_by: string | null
  name: string
  address: string | null
  city: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  notes: string | null
  cover_url: string | null
  created_at: string
  updated_at: string
}

// ─── Idea Board Junction ─────────────────────────────────────────────────────
// Proper many-to-many for idea ↔ board (replaces board_ids[] array).

export interface IdeaBoardItem {
  board_id: string
  idea_id: string
  sort_order: number
  added_at: string
}

// ─── Unified Tagging ─────────────────────────────────────────────────────────
// One tagging system across all core entities.

export type TaggableEntityType = 'work' | 'video' | 'idea' | 'reference' | 'location'

export interface Taggable {
  tag_id: string
  entity_type: TaggableEntityType
  entity_id: string
}

export interface WorkspaceTag {
  id: string
  workspace_id: string
  name: string
  color: string
  created_at: string
}
