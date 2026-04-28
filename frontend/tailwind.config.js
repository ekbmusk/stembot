/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0F0F1A',
        'bg-deep': '#08091A',
        surface: '#1A1A2E',
        'surface-2': '#22243F',
        'surface-3': '#2D305A',
        border: 'rgba(255, 255, 255, 0.06)',
        'border-strong': 'rgba(255, 255, 255, 0.12)',
        primary: {
          DEFAULT: '#6C63FF',
          soft: '#8B82FF',
          dim: '#4F46C5',
        },
        ink: {
          DEFAULT: 'rgba(255, 255, 255, 0.92)',
          muted: 'rgba(255, 255, 255, 0.62)',
          faint: 'rgba(255, 255, 255, 0.38)',
        },
        success: '#34D399',
        warn: '#FBBF24',
        danger: '#F87171',
        // Subject accents — surface as ring/border highlights, not fills.
        physics: '#4FD1C5',
        chemistry: '#A3E635',
        biology: '#34D399',
        mathematics: '#FBBF24',
        informatics: '#A78BFA',
        engineering: '#FB923C',
        astronomy: '#818CF8',
        ecology: '#2DD4BF',
        interdisciplinary: '#F472B6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Unbounded', 'Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        ticker: '0.18em',
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '28px',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(108, 99, 255, 0.35), 0 12px 40px -12px rgba(108, 99, 255, 0.5)',
        soft: '0 1px 0 0 rgba(255, 255, 255, 0.04) inset, 0 12px 40px -24px rgba(0, 0, 0, 0.6)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 320ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'fade-in': 'fade-in 200ms ease-out both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
      backgroundImage: {
        'grid-faint':
          'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
};
