'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-4">
        <AlertTriangle className="w-10 h-10 text-error mx-auto mb-3" />
        <h2 className="font-heading text-xl font-bold text-text-primary mb-2">Halaman tidak dapat dimuat</h2>
        <p className="text-sm text-text-secondary mb-5 max-w-sm">
          Terjadi error saat memuat halaman ini. Pastikan koneksi stabil dan coba kembali.
        </p>
        {error.digest && <p className="text-xs text-text-muted font-mono mb-4">Error ID: {error.digest}</p>}
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="default">Coba Lagi</Button>
          <Button onClick={() => router.push('/dashboard')} variant="secondary">Ke Dashboard</Button>
        </div>
      </div>
    </div>
  )
}
