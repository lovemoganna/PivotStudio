/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        action: '#BD1450',
        ink: Object.fromEntries(['cyan', 'green', 'pink', 'orange', 'yellow', 'purple', 'muted'].map(name => [name, `var(--ps-ink-${name})`])),
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"Noto Sans CJK SC"', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
