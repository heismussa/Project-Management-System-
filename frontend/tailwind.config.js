/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#962c30', // deep red / maroon
        secondary: '#ffc20a', // amber / gold
        green: '#068737', // green accent
      },
    },
  },
  plugins: [],
}

