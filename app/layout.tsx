import type { Metadata } from 'next'
import { Inter, Sora, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { Providers } from '@/components/shared/providers'
import './globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const sora = Sora({ variable: '--font-sora', subsets: ['latin'] })
const jetbrainsMono = JetBrains_Mono({ variable: '--font-jetbrains-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Kanvas OS — Creator Business Operating System',
  description: 'Platform manajemen konten & bisnis untuk content creator',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${sora.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-text-primary">
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  )
}
