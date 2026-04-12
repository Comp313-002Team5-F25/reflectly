/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B1020',
        mist: '#EAF0FF',
        accent: '#7C9CFF',
        amber: '#F6C76E',
      },
      boxShadow: {
        soft: '0 10px 30px rgba(0,0,0,0.15)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
