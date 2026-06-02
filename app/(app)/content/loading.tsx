import { Skeleton } from '@/components/ui/skeleton'
export default function ContentLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-border px-4 py-2.5 flex gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-8 w-28" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="border-b border-border bg-white px-4 py-2.5 flex gap-4">
          {[120, 80, 200, 80, 120, 80, 100, 60, 80].map((w, i) => (
            <Skeleton key={i} className="h-4" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-10 w-10 rounded-md" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
