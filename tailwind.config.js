/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        green: {
          550: '#1a9e4a',
        },
        indigo: {
          50:  '#E8F4F4',
          100: '#C4E3E4',
          200: '#9DD0D2',
          300: '#6FBBBE',
          400: '#3DA3A7',
          500: '#0D7377',
          600: '#0A5C5F',
          700: '#084A4D',
          800: '#06393B',
          900: '#042829',
          950: '#021919',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
