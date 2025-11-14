import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        neo: {
          sand: "#FFFAE5",
          black: "#0f0f0f",
          orange: "#FF4D00",
          accent: "#A3FF00",
          purple: "#9D00FF",
          blue: "#0047FF",
          white: "#ffffff"
        },
        // Cosmic theme colors from launcher
        cosmic: '#03010f',
        'cosmic-glow': {
          primary: '#3a009e8f',
          secondary: '#4413b63b', 
          tertiary: '#27115a5e'
        },
        'cosmic-purple': {
          50: '#c896ff',
          100: '#a855f7',
          200: '#8b5cf6',
          300: '#7c3aed',
          400: '#6d28d9',
          500: '#5b21b6'
        },
        'cosmic-blue': {
          50: '#60a5fa',
          100: '#3b82f6',
          200: '#2563eb'
        }
      },
      fontFamily: {
        inter: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        body: ['var(--font-body)', '"Space Grotesk"', 'sans-serif'],
        display: ['var(--font-display)', '"Syne"', 'sans-serif'],
        heavy: ['var(--font-heavy)', '"Archivo Black"', 'sans-serif']
      },
      boxShadow: {
        neo: '8px 8px 0 0 #0f0f0f',
        'neo-sm': '4px 4px 0 0 #0f0f0f',
        'neo-lg': '12px 12px 0 0 #0f0f0f',
        'neo-hover': '12px 12px 0 0 #0f0f0f',
        'neo-active': '2px 2px 0 0 #0f0f0f',
      },
      animation: {
        'twinkle': 'twinkle 4s ease-in-out infinite',
        'bright-twinkle': 'bright-twinkle 6s ease-in-out infinite',
        'float-particle': 'float-particle 15s linear infinite',
        'nebula-drift': 'nebula-drift 25s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite alternate'
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: '0.4', transform: 'translate3d(0,0,0) scale3d(1,1,1)' },
          '25%': { opacity: '0.9', transform: 'translate3d(0,0,0) scale3d(1.2,1.2,1)' },
          '50%': { opacity: '1', transform: 'translate3d(0,0,0) scale3d(1.4,1.4,1)' },
          '75%': { opacity: '0.7', transform: 'translate3d(0,0,0) scale3d(1.1,1.1,1)' }
        },
        'bright-twinkle': {
          '0%, 100%': { opacity: '0.5', transform: 'translate3d(0,0,0) scale3d(0.8,0.8,1)' },
          '50%': { opacity: '1', transform: 'translate3d(0,0,0) scale3d(1.5,1.5,1)' }
        },
        'float-particle': {
          '0%': { transform: 'translate3d(0, 100vh, 0)', opacity: '0' },
          '5%': { opacity: '1' },
          '95%': { opacity: '1' },
          '100%': { transform: 'translate3d(100px, -10vh, 0)', opacity: '0' }
        },
        'nebula-drift': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale3d(1, 1, 1)', opacity: '0.3' },
          '33%': { transform: 'translate3d(-50px, -30px, 0) scale3d(1.1, 1.1, 1)', opacity: '0.5' },
          '66%': { transform: 'translate3d(40px, 20px, 0) scale3d(0.9, 0.9, 1)', opacity: '0.4' }
        },
        'glow-pulse': {
          '0%': { boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)' },
          '100%': { boxShadow: '0 0 40px rgba(168, 85, 247, 0.8)' }
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))'
      }
    },
  },
  plugins: [],
};
export default config;
