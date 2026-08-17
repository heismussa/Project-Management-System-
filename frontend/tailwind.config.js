/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#962c30', // deep red / maroon
        secondary: '#ffc20a', // amber / gold
        green: '#068737', // green accent
        // Refined brand palette (Implementation Plan redesign) — additive,
        // doesn't touch the flat primary/secondary/green keys above so
        // dormant components (matrix/documents/reports) keep working.
        maroon: {
          900: '#650018',
          800: '#7A0C22',
          700: '#8F172B',
        },
        gold: {
          500: '#D9A323',
          400: '#E7B943',
          100: '#FFF4D8',
        },
        surface: '#FFFFFF',
        background: '#FCFAF7',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}

