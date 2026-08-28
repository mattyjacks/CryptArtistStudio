/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        studio: {
          bg: '#08080f',
          'bg-deep': '#050509',
          panel: '#0e0e1a',
          surface: '#141425',
          elevated: '#1a1a30',
          hover: '#222240',
          border: 'rgba(255, 255, 255, 0.06)',
          'border-bright': 'rgba(255, 255, 255, 0.12)',
          text: '#e4e4ef',
          secondary: '#8888a0',
          muted: '#555570',
          accent: '#e94560',
          cyan: '#00d2ff',
          purple: '#7b2ff7',
          red: '#e94560',
          green: '#4ade80',
          yellow: '#fbbf24',
          orange: '#f97316',
          info: '#3b82f6',
          success: '#22c55e',
          danger: '#ef4444',
          warning: '#eab308',
          pink: '#ec4899',
          teal: '#14b8a6',
          indigo: '#6366f1',
          lime: '#84cc16',
          rose: '#f43f5e',
          sky: '#0ea5e9',
          amber: '#f59e0b',
          emerald: '#10b981',
          violet: '#8b5cf6',
          fuchsia: '#d946ef',
        }
      },
      boxShadow: {
        'glow-sm': '0 0 8px rgba(0, 210, 255, 0.2)',
        'glow-md': '0 0 16px rgba(0, 210, 255, 0.3)',
        'glow-lg': '0 0 32px rgba(0, 210, 255, 0.4)',
        'glow-red': '0 0 16px rgba(233, 69, 96, 0.3)',
        'glow-green': '0 0 16px rgba(74, 222, 128, 0.3)',
        'glow-purple': '0 0 16px rgba(123, 47, 247, 0.3)',
        'inner-sm': 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
        'inner-md': 'inset 0 2px 6px rgba(0, 0, 0, 0.4)',
        'panel': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'elevated': '0 8px 40px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'shimmer': 'shimmer 2s infinite linear',
        'pulse-glow': 'pulseGlow 2s infinite ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        }
      }
    }
  },
  plugins: [],
}
