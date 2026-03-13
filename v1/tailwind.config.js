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
          // Improvement 116: Additional semantic colors
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
      // Improvement 117: Extended spacing scale
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
      // Improvement 118: Extended border radius
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      // Improvement 119: Z-index scale
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      // Improvement 120: Box shadow extensions
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
      // Improvement 121: Extended font sizes
      fontSize: {
        '2xs': ['10px', '14px'],
        '3xs': ['8px', '12px'],
      },
      // Improvement 122: Extended opacity scale
      opacity: {
        '2': '0.02',
        '3': '0.03',
        '4': '0.04',
        '6': '0.06',
        '8': '0.08',
        '12': '0.12',
        '15': '0.15',
        '85': '0.85',
        '98': '0.98',
      },
      // Improvement 123: Backdrop blur extensions
      backdropBlur: {
        'xs': '2px',
        '2xl': '40px',
        '3xl': '64px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-out': 'fadeOut 0.2s ease-in',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'waveform': 'waveform 1.5s ease-in-out infinite',
        'scale-in': 'scaleIn 0.25s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'bounce-in': 'bounceIn 0.4s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'typing': 'typing 1.5s steps(20, end) forwards, blink 0.75s step-end infinite',
        // Improvement 124: New animations
        'float': 'float 3s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'gradient-shift': 'gradientShift 3s ease infinite',
        'expand': 'expand 0.3s ease-out',
        'collapse': 'collapse 0.2s ease-in',
        'pop': 'pop 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(233, 69, 96, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(233, 69, 96, 0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        waveform: {
          '0%, 100%': { transform: 'scaleY(0.5)' },
          '50%': { transform: 'scaleY(1)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        typing: {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        },
        blink: {
          '50%': { borderColor: 'transparent' },
        },
        // Improvement 124: New keyframes
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-1deg)' },
          '50%': { transform: 'rotate(1deg)' },
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        expand: {
          '0%': { opacity: '0', transform: 'scaleY(0)', transformOrigin: 'top' },
          '100%': { opacity: '1', transform: 'scaleY(1)', transformOrigin: 'top' },
        },
        collapse: {
          '0%': { opacity: '1', transform: 'scaleY(1)', transformOrigin: 'top' },
          '100%': { opacity: '0', transform: 'scaleY(0)', transformOrigin: 'top' },
        },
        pop: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '60%': { transform: 'scale(1.05)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      // Improvement 125: Transition duration / timing extensions
      transitionDuration: {
        '0': '0ms',
        '50': '50ms',
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
        '900': '900ms',
        '1200': '1200ms',
        '1500': '1500ms',
        '2000': '2000ms',
      },
      transitionTimingFunction: {
        'bounce': 'cubic-bezier(0.18, 0.89, 0.32, 1.28)',
        'snappy': 'cubic-bezier(0.2, 0, 0, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      // Improvement 216: Extended screens / breakpoints
      screens: {
        'xs': '475px',
        '3xl': '1800px',
        '4xl': '2200px',
        'tall': { 'raw': '(min-height: 800px)' },
        'short': { 'raw': '(max-height: 600px)' },
      },
      // Improvement 217: Min/Max width extensions
      minWidth: {
        '0': '0px',
        '48': '12rem',
        '64': '16rem',
        '80': '20rem',
        '96': '24rem',
        'prose': '65ch',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
        'prose': '65ch',
        'readable': '75ch',
      },
      // Improvement 218: Min/Max height extensions
      minHeight: {
        '48': '12rem',
        '64': '16rem',
        '80': '20rem',
        'screen-50': '50vh',
        'screen-75': '75vh',
      },
      maxHeight: {
        '128': '32rem',
        'screen-50': '50vh',
        'screen-75': '75vh',
        'screen-90': '90vh',
      },
      // Improvement 219: Grid template extensions
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
        '14': 'repeat(14, minmax(0, 1fr))',
        '16': 'repeat(16, minmax(0, 1fr))',
        'auto-fill-sm': 'repeat(auto-fill, minmax(120px, 1fr))',
        'auto-fill-md': 'repeat(auto-fill, minmax(200px, 1fr))',
        'auto-fill-lg': 'repeat(auto-fill, minmax(280px, 1fr))',
        'sidebar': '280px 1fr',
        'sidebar-right': '1fr 280px',
        'holy-grail': '200px 1fr 200px',
      },
      gridTemplateRows: {
        'layout': 'auto 1fr auto',
        'header-body': 'auto 1fr',
      },
      // Improvement 220: Aspect ratio extensions
      aspectRatio: {
        'square': '1 / 1',
        'video': '16 / 9',
        'photo': '4 / 3',
        'portrait': '3 / 4',
        'ultrawide': '21 / 9',
        'vertical': '9 / 16',
      },
      // Improvement 221: Line height extensions
      lineHeight: {
        'tighter': '1.1',
        'relaxed-plus': '1.8',
        'loose': '2.2',
      },
      // Improvement 222: Letter spacing extensions
      letterSpacing: {
        'extra-tight': '-0.05em',
        'extra-wide': '0.15em',
        'ultra-wide': '0.25em',
      },
      // Improvement 223: Text decoration thickness
      textDecorationThickness: {
        '3': '3px',
        '4': '4px',
        '6': '6px',
      },
      // Improvement 224: Ring width extensions
      ringWidth: {
        '3': '3px',
        '5': '5px',
        '6': '6px',
      },
      // Improvement 225: Gap extensions
      gap: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
    },
  },
  plugins: [],
}
