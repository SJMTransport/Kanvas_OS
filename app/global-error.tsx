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
          <p className="text-text-secondary mb-6 max-w-sm mx-auto">Server mengalami error. Coba refresh halaman atau hubungi support jika masalah berlanjut.</p>
          
          {/* Detail Error */}
          <div className="mb-6 max-w-md mx-auto p-4 bg-red-50 border border-red-100 rounded-xl text-left shadow-sm">
            <p className="text-xs font-bold text-red-800 uppercase tracking-wider mb-1">Detail Teknis:</p>
            <p className="text-xs font-mono text-red-700 break-all select-all leading-relaxed whitespace-pre-wrap">
              {error.name || 'Error'}: {error.message || 'Unknown error occurred'}
            </p>
            {error.digest && <p className="text-[10px] text-red-500 font-mono mt-2 pt-1 border-t border-red-100/50">Digest: {error.digest}</p>}
          </div>

          <Button onClick={reset}>Coba Lagi</Button>
        </div>
      </body>
    </html>
  )
}
