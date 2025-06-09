/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        irysBlack: '#0f0f0f',
        irysGray: '#1a1a1a',
        irysText: '#f4f4f4',
        irysAccent: '#00ffd2',
        irysDanger: '#ff4b4b'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      },
    },
  },
  plugins: [],
}
