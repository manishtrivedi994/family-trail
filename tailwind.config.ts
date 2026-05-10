import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ft: {
          bg:      '#08060F',
          bg2:     '#100D1E',
          bg3:     '#17132B',
          bg4:     '#1F1A38',
          border:  'rgba(160,130,255,0.12)',
          border2: 'rgba(160,130,255,0.22)',
          border3: 'rgba(160,130,255,0.40)',
          v50:  '#F3F0FF',
          v100: '#DDD5FF',
          v200: '#C4B5FD',
          v400: '#9B7AFF',
          v500: '#7C5CFF',
          v600: '#6344E0',
          v700: '#4B30B8',
          teal: '#2DD4BF',
          gold: '#D4A843',
          rose: '#E879A0',
          text:  '#EDE9FF',
          text2: 'rgba(237,233,255,0.6)',
          text3: 'rgba(237,233,255,0.3)',
        },
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
    },
  },
  plugins: [],
} satisfies Config
