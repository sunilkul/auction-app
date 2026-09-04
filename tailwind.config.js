/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './public/index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        void:    '#020617',
        surface: '#0f172a',
        card:    '#1e293b',
        gold:    '#f59e0b',
        'gold-light': '#fcd34d',
        'gold-dark':  '#b45309',
        sky:     '#38bdf8',
        violet:  '#818cf8',
        emerald: '#34d399',
        rose:    '#f87171',
      },
      fontFamily: {
        display: ["'Barlow Condensed'", 'sans-serif'],
        body:    ["'Inter'", 'system-ui', 'sans-serif'],
        mono:    ["'Space Mono'", 'monospace'],
      },
      animation: {
        'shimmer':     'shimmer 2.5s linear infinite',
        'float':       'float 6s ease-in-out infinite',
        'glow-pulse':  'glowPulse 2s ease-in-out infinite',
        'aurora':      'aurora 10s ease infinite alternate',
        'spin-slow':   'spin 8s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-10px)' },
        },
        glowPulse: {
          '0%,100%': { boxShadow: '0 0 20px rgba(245,158,11,0.3)' },
          '50%':     { boxShadow: '0 0 40px rgba(245,158,11,0.6), 0 0 80px rgba(245,158,11,0.2)' },
        },
        aurora: {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
    },
  },
  plugins: [],
};
