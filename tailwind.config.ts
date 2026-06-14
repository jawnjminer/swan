/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'mx-bg': '#0a0a0a',
        'mx-panel': '#1a1a1e',
        'mx-border': '#2e2e32',
        'mx-text': '#e0e0e0',
        'mx-text-dim': '#888888',
        'mx-ecg': '#00ff00',
        'mx-abp': '#ff3333',
        'mx-pap': '#ffcc00',
        'mx-cvp': '#3399ff',
        'mx-spo2': '#00ccff',
        'mx-alarm-yellow': '#ffaa00',
        'mx-alarm-red': '#ff0000',
      },
      fontFamily: {
        'mono': ['"Roboto Mono"', 'monospace'],
        'sans': ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
