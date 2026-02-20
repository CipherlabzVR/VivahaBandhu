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
          DEFAULT: '#D4AF37',
          dark: '#B8941F',
          light: '#E8C85A',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#E8C85A',
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
        'playwrite-cu': ['Playwrite CU', 'cursive'],
        'playwrite-guides': ['Playwrite Guides', 'cursive'],
        'dancing-script': ['Dancing Script', 'cursive'],
        'great-vibes': ['Great Vibes', 'cursive'],
      },
      boxShadow: {
        'gold': '0 2px 20px rgba(212, 175, 55, 0.25)',
      },
    },
  },
  plugins: [],
};
export default config;

