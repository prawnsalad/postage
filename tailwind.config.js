const colors = require('tailwindcss/colors')

module.exports = {
  purge: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
    colors: {
      transparent: 'transparent',
      // https://tailwindcss.com/docs/customizing-colors#color-palette-reference
      primary: colors.indigo,
      neutral: colors.warmGray,
      danger: colors.red,
      success: colors.green,
      info: colors.yellow,
      blue: colors.blue,
      white: '#fff',
      black: '#000',
    },
  },
  variants: {
    extend: {
      margin: ['children', 'children-first', 'children-last'],
      width: ['focus', 'hover'],
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwindcss-children'),
  ],
}
