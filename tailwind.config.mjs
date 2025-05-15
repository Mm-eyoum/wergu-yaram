/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f7f4',
          100: '#ccefe9',
          200: '#99dfd3',
          300: '#66cfbd',
          400: '#33bfa7',
          500: '#00af91', // Main primary color
          600: '#008c74',
          700: '#006957',
          800: '#00463a',
          900: '#00231d',
        },
        secondary: {
          50: '#e6eef4',
          100: '#ccdde9',
          200: '#99bbd3',
          300: '#6699bd',
          400: '#3377a7',
          500: '#005591', // Main secondary color
          600: '#004474',
          700: '#003357',
          800: '#00223a',
          900: '#00111d',
        },
        accent: {
          50: '#e8f4e6',
          100: '#d1e9cd',
          200: '#a3d39b',
          300: '#75bd69',
          400: '#47a737',
          500: '#199105', // Accent color
          600: '#147404',
          700: '#0f5703',
          800: '#0a3a02',
          900: '#051d01',
        },
      },
      fontFamily: {
        sans: ['Inter var', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '128': '32rem',
      },
      height: {
        'screen-70': '70vh',
        'screen-80': '80vh',
      },
    },
  },
  plugins: [],
}