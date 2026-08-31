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
        background: '#EAF4F1',
        surface: '#FFFFFF',
        'surface-secondary': '#F7FAF9',
        'surface-warm': '#FFFDFC',
        subtle: '#EFF7F5',
        border: '#E8EEEC',
        'border-strong': '#CBD9D5',
        'text-primary': '#202524',
        'text-secondary': '#68716F',
        'text-muted': '#98A19F',
        teal: {
          50: '#EFF7F5',
          100: '#DCEFED',
          200: '#B8DFC',
          300: '#8AC7C5',
          400: '#67B1B0',
          500: '#4C9998',
          600: '#287978',
          700: '#1E5E5D',
          800: '#154544',
          900: '#0F302F',
        },
        accent: {
          DEFAULT: '#4C9998',
          light: '#EFF7F5',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        tiktok: '#000000',
        instagram: '#E1306C',
        youtube: '#FF0000',
        facebook: '#1877F2',
        foreground: '#202524',
        card: { DEFAULT: '#FFFFFF', foreground: '#202524' },
        popover: { DEFAULT: '#FFFFFF', foreground: '#202524' },
        primary: { DEFAULT: '#4C9998', foreground: '#FFFFFF' },
        secondary: { DEFAULT: '#FFFFFF', foreground: '#202524' },
        muted: { DEFAULT: '#EFF7F5', foreground: '#68716F' },
        destructive: { DEFAULT: '#EF4444', foreground: '#FFFFFF' },
        input: '#E8EEEC',
        ring: '#4C9998',
      },
      borderRadius: {
        xs: '0.375rem',  // 6px
        sm: '0.5rem',    // 8px
        md: '0.75rem',   // 12px
        lg: '1rem',      // 16px
        xl: '1.25rem',   // 20px
        '2xl': '1.5rem', // 24px
        full: '9999px',
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(30, 70, 65, 0.04)',
        popover: '0 4px 16px rgba(30, 70, 65, 0.06)',
        modal: '0 12px 32px rgba(30, 70, 65, 0.08)',
        card: '0 2px 8px rgba(30, 70, 65, 0.04)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
