/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#f0f3ff',
          100: '#dbe1ff',
          200: '#b5c1ff',
          300: '#8a9bff',
          400: '#5f74ff',
          500: '#3a4dff',
          600: '#1a2b6b',
          700: '#0f1d4f',
          800: '#0a1538',
          900: '#060d24',
          950: '#030714',
        },
        solar: {
          50:  '#fffbeb',
          100: '#fff3c4',
          200: '#ffe588',
          300: '#ffd54f',
          400: '#ffc107',
          500: '#f5a623',
          600: '#d4881c',
          700: '#a86a15',
          800: '#7c4e0e',
          900: '#503207',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'fade-in': 'fade-in 0.6s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 193, 7, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(255, 193, 7, 0.6)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
