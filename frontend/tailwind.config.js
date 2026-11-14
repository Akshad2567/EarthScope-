/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#050b1a',
          900: '#07102a',
          800: '#0b1730',
          700: '#10203f',
          600: '#15284d',
          500: '#1d3563',
        },
        accent: {
          DEFAULT: '#22b8ff',
          soft: '#7dd3fc',
        },
        teal: { DEFAULT: '#19d3a2' },
        violet: { DEFAULT: '#8b5cf6' },
        ink: { DEFAULT: '#e6eefc', muted: '#9fb3d9', faint: '#6b7fa8' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(34,184,255,0.25), 0 8px 30px -8px rgba(34,184,255,0.35)',
      },
    },
  },
  plugins: [],
}
