import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1a3a5c',
          dark: '#0f2540',
          light: '#2a5a8c',
        },
        intrant: {
          orange: '#e8541a',
          green: '#27ae60',
          yellow: '#f39c12',
          red: '#e74c3c',
          light: '#f4f6f9',
          border: '#dde3eb',
          text: '#2c3e50',
          muted: '#6c7a8d',
        },
      },
    },
  },
  plugins: [],
}

export default config
