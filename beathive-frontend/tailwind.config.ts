import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Inter', 'sans-serif'],
      },
      colors: {
        base:    'var(--bg-base)',
        surface: 'var(--bg-surface)',
        lift:    'var(--bg-lift)',
        rim:     'var(--bg-rim)',
        // Arsonus primary: carrot orange
        accent: {
          DEFAULT: '#F7941D',
          dim:     '#e07e0a',
          bright:  '#ffaa4d',
          glow:    'rgba(247,148,29,0.22)',
        },
        // Arsonus secondary: verdigris
        teal: {
          DEFAULT: '#00A79D',
          dim:     '#008c83',
        },
        // Arsonus tertiary: carmine
        carmine: {
          DEFAULT: '#BE1E2D',
          dim:     '#a01828',
        },
        muted: '#6b7280',
      },
      backgroundImage: {
        'hero-glow':   'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(247,148,29,0.15) 0%, transparent 65%)',
        'card-glow':   'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(247,148,29,0.06) 0%, transparent 70%)',
      },
      animation: {
        'slide-in':  'slideIn 0.22s ease-out',
        'fade-up':   'fadeUp 0.35s ease-out',
        'eq':        'eq 1s ease-in-out infinite',
        'glow-pulse':'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        slideIn: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        eq: {
          '0%,100%': { transform: 'scaleY(0.4)' },
          '50%':     { transform: 'scaleY(1)' },
        },
        glowPulse: {
          '0%,100%': { opacity: '0.6' },
          '50%':     { opacity: '1' },
        },
      },
      boxShadow: {
        'glow':     '0 0 24px rgba(247,148,29,0.35)',
        'glow-sm':  '0 0 12px rgba(247,148,29,0.2)',
        'surface':  '0 2px 8px rgba(0,0,0,0.5)',
        'elevated': '0 8px 32px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
}

export default config
