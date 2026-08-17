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
        background: '#F1F7F5',
        surface: '#FFFFFF',
        'surface-warm': '#FFFDFC',
        subtle: '#EAF4F1',
        border: '#DDE7E4',
        'border-strong': '#CBD9D5',
        'text-primary': '#202524',
        'text-secondary': '#68716F',
        'text-muted': '#98A19F',
        teal: {
          50: '#F1F7F5',
          100: '#EAF4F1',
          200: '#DCEEEA',
          300: '#B4DAD2',
          400: '#7BB8B2',
          500: '#49878A',
          600: '#3A6F72',
          700: '#2E585B',
          800: '#234244',
          900: '#1A3032',
        },
        accent: {
          DEFAULT: '#49878A',
          light: '#EAF4F1',
        },
        success: '#15803D',
        warning: '#B45309',
        error: '#DC2626',
        tiktok: '#000000',
        instagram: '#E1306C',
        youtube: '#FF0000',
        facebook: '#1877F2',
        foreground: '#202524',
        card: { DEFAULT: '#FFFFFF', foreground: '#202524' },
        popover: { DEFAULT: '#FFFFFF', foreground: '#202524' },
        primary: { DEFAULT: '#49878A', foreground: '#FFFFFF' },
        secondary: { DEFAULT: '#FFFFFF', foreground: '#202524' },
        muted: { DEFAULT: '#EAF4F1', foreground: '#68716F' },
        destructive: { DEFAULT: '#DC2626', foreground: '#FFFFFF' },
        input: '#DDE7E4',
        ring: '#49878A',
      },
      borderRadius: {
        xs: '0.375rem',  // 6px
        sm: '0.5rem',    // 8px
        md: '0.625rem',  // 10px
        lg: '0.875rem',  // 14px
        xl: '1rem',      // 16px
        full: '9999px',
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(30, 70, 65, 0.06)',
        popover: '0 4px 12px rgba(30, 70, 65, 0.08)',
        modal: '0 8px 24px rgba(30, 70, 65, 0.10)',
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
