/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ARIS Tech Theme — Black & Green
        brand: {
          black: '#090d0b',
          charcoal: '#0d1310',
          card: '#121a15',
          border: '#1f2e25',
          deepGreen: '#123020',
          forest: '#18472b',
          neon: '#22c55e',
          neonLight: '#4ade80',
          mint: '#86efac',
          muted: '#7e9687',
        },
        aris: {
          black: '#0a0a0a',
          dark: '#111111',
          panel: '#161616',
          card: '#1a1a1a',
          surface: '#222222',
          border: '#2a2a2a',
          muted: '#888888',
          text: '#e0e0e0',
          white: '#f0f0f0',
        },
        neon: {
          50:  '#e8fff0',
          100: '#c4ffd9',
          200: '#8dffb7',
          300: '#4dff8e',
          400: '#00ff66',
          500: '#00e05a',
          600: '#00c44e',
          700: '#00a040',
          800: '#007d32',
          900: '#005c25',
          950: '#003316',
        },
        accent: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(0,255,102,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,102,0.03) 1px, transparent 1px)',
        'glow-radial': 'radial-gradient(ellipse at center, rgba(0,255,102,0.08) 0%, transparent 70%)',
      },
      backgroundSize: {
        'grid-40': '40px 40px',
      },
      boxShadow: {
        'neon': '0 0 15px rgba(0, 255, 102, 0.15)',
        'neon-lg': '0 0 30px rgba(0, 255, 102, 0.2), 0 0 60px rgba(0, 255, 102, 0.05)',
        'neon-sm': '0 0 8px rgba(0, 255, 102, 0.1)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'glass-sm': '0 4px 16px rgba(0, 0, 0, 0.3)',
        'glow-neon': '0 0 18px -2px rgba(34, 197, 94, 0.45)',
        'glow-card': '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 1px 1px rgba(34, 197, 94, 0.15)',
        'glow-banner': '0 12px 30px -4px rgba(34, 197, 94, 0.2), 0 0 0 1px rgba(74, 222, 128, 0.35)',
        'floating-bar': '0 -8px 25px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(34, 197, 94, 0.2)',
      },
      animation: {
        'pulse-neon': 'pulseNeon 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        pulseNeon: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 255, 102, 0.1)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 255, 102, 0.2)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 255, 102, 0.1), inset 0 0 5px rgba(0, 255, 102, 0.05)' },
          '100%': { boxShadow: '0 0 15px rgba(0, 255, 102, 0.2), inset 0 0 10px rgba(0, 255, 102, 0.08)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
