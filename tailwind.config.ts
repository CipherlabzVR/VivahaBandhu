import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#F97316',
          dark: '#EA580C',
          light: '#FB923C',
        },
        gold: {
          DEFAULT: '#F97316',
          light: '#FB923C',
        },
        cream: {
          DEFAULT: '#FDF8F3',
          dark: '#F5EDE3',
        },
        text: {
          dark: '#2D2A26',
          light: '#6B6560',
        },
        white: '#FFFFFF',
      },
      fontFamily: {
        playfair: ['var(--font-playfair)', 'serif'],
        'source-sans': ['var(--font-source-sans)', 'sans-serif'],
        pacifico: ['var(--font-pacifico)', 'cursive'],
        'emilys-candy': ['"Emilys Candy"', 'cursive'],
        'playwrite-cu': ['Playwrite CU', 'cursive'],
        'playwrite-guides': ['Playwrite Guides', 'cursive'],
        'dancing-script': ['Dancing Script', 'cursive'],
        'great-vibes': ['Great Vibes', 'cursive'],
        sinhala: ['"Noto Sans Sinhala"', 'sans-serif'],
      },
      boxShadow: {
        'gold': '0 2px 20px rgba(249, 115, 22, 0.25)',
      },
      keyframes: {
        'heart-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.08)', opacity: '0.9' },
        },
        'heart-draw': {
          from: { strokeDashoffset: 'var(--heart-length, 60)' },
          to: { strokeDashoffset: '0' },
        },
        'heart-draw-loop': {
          '0%': { strokeDashoffset: 'var(--heart-length, 60)' },
          '50%': { strokeDashoffset: '0' },
          '100%': { strokeDashoffset: 'var(--heart-length, 60)' },
        },
        'loading-bar': {
          '0%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(150%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        'letter-in': {
          from: { opacity: '0', transform: 'translateY(0.4em)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'price-bg': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'price-pulse': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' },
        },
        'price-float': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -20px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.95)' },
        },
        'glass-shine': {
          '0%, 100%': { boxShadow: '0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)' },
          '50%': { boxShadow: '0 8px 40px rgba(249,115,22,0.15), inset 0 1px 0 rgba(255,255,255,0.8)' },
        },
      },
      animation: {
        'heart-pulse': 'heart-pulse 1s ease-in-out infinite',
        'heart-draw': 'heart-draw 1.5s ease-in-out forwards',
        'heart-draw-loop': 'heart-draw-loop 3s ease-in-out infinite',
        'loading-bar': 'loading-bar 1.2s ease-in-out infinite',
        'letter-in': 'letter-in 0.4s ease-out forwards',
        'price-bg': 'price-bg 8s ease-in-out infinite',
        'price-pulse': 'price-pulse 5s ease-in-out infinite',
        'price-float': 'price-float 8s ease-in-out infinite',
        'glass-shine': 'glass-shine 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;

