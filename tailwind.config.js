/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
      colors: {
        sidebar: {
          DEFAULT: '#0f1d14',
          active: '#1e3527',
        },
        esg: {
          climate: '#16a34a',
          circularity: '#2563eb',
          nature: '#0d9488',
          social: '#ea580c',
          governance: '#7c3aed',
        },
      },
    },
  },
  plugins: [],
}
