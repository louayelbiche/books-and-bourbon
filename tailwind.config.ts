import type { Config } from 'tailwindcss'

const capitalvPreset = require("@runwell/capitalv-brand-kit/tailwind/preset");

const config: Config = {
  presets: [capitalvPreset],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Override display font for elevated typography
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
      },
      // Site-specific extensions (brand kit provides base colors)
      colors: {
        // Aliases for backwards compatibility with existing classes
        'brand-black': '#0a0a0a',
        'brand-burgundy': '#3B0F11',
        'brand-burgundy-dark': '#2a0b0c',
        'brand-burgundy-light': '#5c1a1e',
        'brand-gold': '#a18320',
        'brand-cream': '#f5e6d4',
        'brand-tan': '#c6c0ab',
        // Semantic aliases
        'surface': '#111111',
        'surface-elevated': '#1a1a1a',
        'text-primary': '#F5F0E8',
        'text-secondary': '#a0a0a0',
        'text-muted': '#666666',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-burgundy': 'linear-gradient(135deg, #3B0F11 0%, #2a0b0c 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'scale-in': 'scaleIn 0.4s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
