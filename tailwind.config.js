/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0b0d10',
        surface: '#14171c',
        surface2: '#1b1f26',
        border: '#262b33',
        live: '#2dd4a0',
        removed: '#ef5d5d',
        pending: '#e8b339',
        muted: '#7d8693',
      },
    },
  },
  safelist: [
    'stroke-live',
    'stroke-removed',
    'stroke-pending',
    'stroke-muted',
    'text-live',
    'text-removed',
    'text-pending',
    'text-muted',
    'bg-live',
    'bg-removed',
    'bg-pending',
    'bg-muted',
  ],
  plugins: [],
};
