'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,      // data fresh 5 menit
            gcTime: 1000 * 60 * 10,         // cache 10 menit
            retry: 1,
            refetchOnWindowFocus: false,
            // Phase 03D — this override was the confirmed root cause of
            // Calendar/Dashboard staying stale after a schedule mutation:
            // invalidateQueries() only forces an immediate refetch for
            // currently-mounted queries; a route visited AFTER invalidation
            // relies on refetch-on-mount to pick up the now-stale cache,
            // which this override disabled app-wide. Reverted to the
            // library default (refetch only when data is actually stale or
            // invalidated — not on every mount).
          },
        },
      })
  )
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
