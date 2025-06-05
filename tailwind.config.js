/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // インスタ風カラーパレット
        'insta': {
          pink: '#e1306c',
          orange: '#fd1d1d', 
          purple: '#833ab4',
          gradient: 'linear-gradient(45deg, #833ab4, #fd1d1d, #e1306c)',
        },
        'pastel': {
          mint: '#a8e6cf',
          coral: '#ffb3ba',
          lavender: '#d4a5ff',
          peach: '#ffdfba',
          sky: '#bae1ff',
        }
      },
      // 後でアニメーションとかも追加できる
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-soft': 'pulse 3s infinite',
      }
    },
  },
  plugins: [],
}