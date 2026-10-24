/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        industrial: {
          900: '#0d1117',
          800: '#161b22',
          700: '#21262d',
          600: '#30363d',
          500: '#484f58',
          accent: '#238636',
          amber: '#d29922',
          danger: '#f85149',
          cyan: '#388bfd'
        }
      }
    },
  },
  plugins: [],
}
