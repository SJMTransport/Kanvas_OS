'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <html lang="id">
      <body className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-4">
          <AlertTriangle className="w-12 h-12 text-error mx-auto mb-4" />
          <h1 className="font-heading text-2xl font-bold text-text-primary mb-2">Terjadi Kesalahan</h1>
          <p className="text-text-secondary mb-6 max-w-sm">Server mengalami error. Coba refresh halaman atau hubungi support jika masalah berlanjut.</p>
          {error.digest && <p className="text-xs text-text-muted font-mono mb-4">ID: {error.digest}</p>}
          <Button onClick={reset}>Coba Lagi</Button>
        </div>
      </body>
    </html>
  )
}
