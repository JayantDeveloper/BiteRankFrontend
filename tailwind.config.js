/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf4f3',
          100: '#fbe8e6',
          200: '#f7d1cd',
          300: '#f0ada5',
          400: '#e67f73',
          500: '#b45343',
          600: '#9e4739',
          700: '#853c31',
          800: '#6d322a',
          900: '#5a2923',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#FFC107',
          600: '#f59e0b',
          700: '#d97706',
          800: '#b45309',
          900: '#92400e',
        },
      },
    },
  },
  plugins: [],
}
