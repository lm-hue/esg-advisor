/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        esg: {
          climate: '#3B82F6',
          circularity: '#22C55E',
          nature: '#14B8A6',
          social: '#F97316',
          governance: '#8B5CF6',
        },
      },
    },
  },
  plugins: [],
}
