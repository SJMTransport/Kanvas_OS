// Brand Schedule now reads from the shared Schedule Engine
// (lib/hooks/useScheduleEvents.ts) — this file is kept as a thin,
// backward-compatible wrapper so /brand/[id] and /brand/jadwal don't need
// to change. Same query results as before; the underlying fetch is now
// shared with Dashboard instead of duplicated.
export { useBrandScheduleEvents as useBrandSchedule, useAllBrandsScheduleEvents as useAllBrandsSchedule } from './useScheduleEvents'
export type { ScheduleEvent as BrandScheduleItem, ScheduleEventType as BrandScheduleCategory } from './useScheduleEvents'
