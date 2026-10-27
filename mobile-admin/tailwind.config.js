/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        'fira-regular': ['FiraSans-Regular'],
        'fira-medium': ['FiraSans-Medium'],
        'fira-bold': ['FiraSans-Bold'],
        'fira-code': ['FiraCode-Regular'],
        'fira-code-medium': ['FiraCode-Medium'],
        'fira-code-bold': ['FiraCode-Bold'],
      },
    },
  },
  plugins: [],
};
