/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1DB954',
        'primary-hover': '#1ed760',
        'primary-dark': '#1aa34a',
        'bg-dark': '#121212',
        'bg-secondary': '#181818',
        'bg-tertiary': '#282828',
        'text-primary': '#FFFFFF',
        'text-secondary': '#B3B3B3',
        'text-muted': '#6B6B6B',
      },
    },
  },
  plugins: [],
}
