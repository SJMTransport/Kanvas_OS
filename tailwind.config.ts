import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        background: '#FFFFFF',
        surface: '#F9F9F8',
        subtle: '#F4F5F7',
        border: '#E8EAED',
        'border-md': '#D1D5DB',
        'text-primary': '#111827',
        'text-secondary': '#6B7280',
        'text-muted': '#9CA3AF',
        accent: {
          DEFAULT: '#D4860A',
          light: '#FEF3C7',
        },
        success: '#16A34A',
        warning: '#D97706',
        error: '#DC2626',
        tiktok: '#000000',
        instagram: '#E1306C',
        youtube: '#FF0000',
        facebook: '#1877F2',
        foreground: '#111827',
        card: { DEFAULT: '#FFFFFF', foreground: '#111827' },
        popover: { DEFAULT: '#FFFFFF', foreground: '#111827' },
        primary: { DEFAULT: '#D4860A', foreground: '#FFFFFF' },
        secondary: { DEFAULT: '#F4F5F7', foreground: '#111827' },
        muted: { DEFAULT: '#F4F5F7', foreground: '#6B7280' },
        destructive: { DEFAULT: '#DC2626', foreground: '#FFFFFF' },
        input: '#E8EAED',
        ring: '#D4860A',
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
        heading: ['var(--font-sora)', 'Sora', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
