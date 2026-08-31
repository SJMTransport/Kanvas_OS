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
        <p className="text-sm text-text-secondary mb-5 max-w-sm mx-auto">
          Terjadi error saat memuat halaman ini. Pastikan koneksi stabil dan coba kembali.
        </p>
        
        {/* Detail Error */}
        <div className="mb-6 max-w-md mx-auto p-4 bg-red-50 border border-red-100 rounded-xl text-left shadow-sm">
          <p className="text-xs font-bold text-red-800 uppercase tracking-wider mb-1">Detail Teknis:</p>
          <p className="text-xs font-mono text-red-700 break-all select-all leading-relaxed whitespace-pre-wrap">
            {error.name || 'Error'}: {error.message || 'Unknown error occurred'}
          </p>
          {error.digest && <p className="text-[10px] text-red-500 font-mono mt-2 pt-1 border-t border-red-100/50">Digest: {error.digest}</p>}
        </div>

        <div className="flex gap-3 justify-center">
          <Button onClick={() => { reset(); window.location.reload(); }} variant="default">Coba Lagi</Button>
          <Button onClick={() => { window.location.href = '/dashboard'; }} variant="secondary">Ke Dashboard</Button>
        </div>
      </div>
    </div>
  )
}
