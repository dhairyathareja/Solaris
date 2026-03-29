/* File overview: frontend/tailwind.config.js
 * Purpose: defines Tailwind scan paths and maps design tokens to utility colors.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'sol-void': 'var(--sol-void)',
        'sol-deep': 'var(--sol-deep)',
        'sol-surface': 'var(--sol-surface)',
        'sol-border': 'var(--sol-border)',
        'sol-gold': 'var(--sol-gold)',
        'sol-gold-dim': 'var(--sol-gold-dim)',
        'sol-plasma': 'var(--sol-plasma)',
        'sol-corona': 'var(--sol-corona)',
        'sol-muted': 'var(--sol-muted)',
        'sol-glow': 'var(--sol-glow)',
        'sol-blue': 'var(--sol-blue)',
      },
      fontFamily: {
        'sans': ['Inter', 'sans-serif'],
        'syncopate': ['Inter', 'sans-serif'],
        'space': ['Inter', 'sans-serif'],
        'mono': ['Inter', 'monospace'],
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(0)', top: '0%' },
          '100%': { transform: 'translateY(0)', top: '100%' },
        }
      }
    }
  },
  plugins: [],
}