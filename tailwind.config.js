/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        samjho: {
          50: '#F5F5FA',
          100: '#EBEBFA',
          200: '#D5D5F5',
          300: '#B0B0EE',
          400: '#8882E4',
          500: '#685FE0',
          600: '#5347D2',
          700: '#4337B6',
          800: '#382F94',
          900: '#2E2777',
          950: '#1C174E',
        },
        surface: {
          light: '#FBFBFA',
          subtle: '#F4F4F0',
          border: '#E7E7E0',
          card: '#FFFFFF',
          dark: '#121212',
          darkSubtle: '#1A1A1A',
          darkBorder: '#2A2A2A',
          darkCard: '#1E1E1E',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
        'float': '0 10px 30px -5px rgba(104, 95, 224, 0.15)',
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
