import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0C224B',
        brand: '#2AA4E7',
        ocean: '#0A60AD',
        cream: '#FFFAE6',
        mist: '#E9FCFF',
        frost: '#A9EFFB',
        silver: '#E8EBEF',
      },
    },
  },
  plugins: [],
}

export default config
