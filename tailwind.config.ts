import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#08121f',
        surface2: '#0f1b2d',
        accent: '#82c7ff',
        success: '#7ee787',
        info: '#83c5ff',
        warning: '#ffb74d',
        danger: '#fb7185'
      },
      boxShadow: {
        glow: '0 20px 80px rgba(34, 197, 94, 0.18)'
      }
    }
  },
  plugins: []
};

export default config;
