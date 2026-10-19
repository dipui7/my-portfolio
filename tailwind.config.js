/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./*.html', './stories/**/*.html', './assets/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#0b0b0c', 900: '#111113', 800: '#18181b', 700: '#232327', 600: '#2e2e33' },
        bone: { DEFAULT: '#f5f2ec', 300: '#cfc9bf', 400: '#a39d93', 500: '#7d776e' },
        ember: { DEFAULT: '#d4a35a', 400: '#e2b978', 600: '#b5853e' },
        paper: { DEFAULT: '#f7f4ee', 200: '#ece6da' },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'Cambria', 'serif'],
      },
      transitionTimingFunction: { cinematic: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    },
  },
  plugins: [],
};
