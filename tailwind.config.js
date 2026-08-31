/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          500: '#2f5fe0',
          600: '#254bb3',
          700: '#1c3a8a',
        },
      },
    },
  },
  plugins: [],
}
