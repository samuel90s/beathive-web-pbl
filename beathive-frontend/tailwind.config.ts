import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        base:    '#0c0d16',
        surface: '#13141f',
        lift:    '#1c1d2e',
        rim:     'rgba(255,255,255,0.07)',
        accent: {
          DEFAULT: '#8b5cf6',
          dim:     '#7c3aed',
          bright:  '#a78bfa',
          glow:    'rgba(139,92,246,0.22)',
        },
        teal: {
          DEFAULT: '#2dd4bf',
          dim:     '#14b8a6',
        },
        muted: '#6b7280',
      },
      backgroundImage: {
        'hero-glow':   'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(139,92,246,0.2) 0%, transparent 65%)',
        'card-glow':   'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(139,92,246,0.08) 0%, transparent 70%)',
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
        'glow':     '0 0 24px rgba(139,92,246,0.35)',
        'glow-sm':  '0 0 12px rgba(139,92,246,0.2)',
        'surface':  '0 2px 8px rgba(0,0,0,0.5)',
        'elevated': '0 8px 32px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
}

export default config
