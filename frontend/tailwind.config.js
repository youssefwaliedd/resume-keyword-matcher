/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        bg: '#F7F5F0',
        surface: '#FFFFFF',
        'surface-2': '#F2EFE9',
        ink: '#1A1916',
        'ink-2': '#5C5A54',   // 6.90:1 on white ✓
        'ink-3': '#696560',   // 5.78:1 on white ✓ (was #A09D96 — FAILED at 2.71:1)
        border: '#E5E2DA',
        'border-2': '#CCC9C0',
        accent: {
          DEFAULT: '#1A5C38',  // 7.98:1 on white ✓
          light: '#E8F5EE',
          hover: '#154D2F',
        },
        matched: { DEFAULT: '#1A5C38', bg: '#E8F5EE', border: '#B6DEC7' },
        missing: { DEFAULT: '#C13515', bg: '#FEF0EC', border: '#F4B8A5' },
        preferred: { DEFAULT: '#8B6914', bg: '#FEF9E6', border: '#E8D48A' },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(26,25,22,0.06), 0 1px 2px -1px rgba(26,25,22,0.06)',
        'card-hover': '0 4px 12px 0 rgba(26,25,22,0.10), 0 2px 4px -2px rgba(26,25,22,0.06)',
      },
      minHeight: {
        touch: '44px', // touch target minimum
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
}
