import { Skeleton } from '@/components/ui/skeleton'
export default function BrandLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-64 shrink-0 space-y-3">
            <Skeleton className="h-8 w-full rounded-lg" />
            {Array.from({ length: 3 }).map((_, j) => <Skeleton key={j} className="h-24 w-full rounded-lg" />)}
          </div>
        ))}
      </div>
    </div>
  )
}
