import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Font Families from Brand Guidelines
      fontFamily: {
        // Primary Display: Orbitron - Futuristic sci-fi, logos, hero text
        display: ['Orbitron', 'monospace'],
        // Primary Heading: Space Grotesk - Modern geometric, headings
        heading: ['Space Grotesk', 'sans-serif'],
        // Body Text: DM Sans - Screen-optimized readability
        body: ['DM Sans', 'sans-serif'],
        // Monospace: Space Mono - Code, data, technical
        mono: ['Space Mono', 'monospace'],
      },
      
      // Color System from Brand Guidelines
      colors: {
        // Neon Accents
        'neon-cyan': '#04D9FF',
        'neon-blue': '#1F51FF',
        'neon-purple': '#8A00C4',
        'neon-pink': '#FB48C4',
        'neon-orange': '#FF5C00',
        'neon-green': '#2CFF05',
        
        // Backgrounds (Never use pure #000000)
        'bg-deepest': '#0B192A',
        'bg-primary': '#1E1E1E',
        'bg-charcoal': '#232729',
        
        // Surfaces
        'surface-1': '#2E2E2E',
        'surface-2': '#383838',
        'surface-3': '#424242',
        
        // Text (WCAG AA compliant)
        'text-primary': '#FAFAFA',
        'text-secondary': '#B0B0B0',
        'text-tertiary': '#808080',
      },
      
      // Animation timing
      transitionDuration: {
        'instant': '100ms',
        'fast': '200ms',
        'normal': '300ms',
        'slow': '400ms',
      },
      
      // Easing functions
      transitionTimingFunction: {
        'standard': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'smooth': 'cubic-bezier(0.65, 0, 0.35, 1)',
        'elastic': 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
      },
      
      // Border radius
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },
      
      // Box shadows with neon glow
      boxShadow: {
        'neon-cyan': '0 0 10px rgba(4, 217, 255, 0.3), 0 0 20px rgba(4, 217, 255, 0.2)',
        'neon-green': '0 0 10px rgba(44, 255, 5, 0.3), 0 0 20px rgba(44, 255, 5, 0.2)',
        'neon-purple': '0 0 10px rgba(138, 0, 196, 0.3), 0 0 20px rgba(138, 0, 196, 0.2)',
        'glass': '0 2px 4px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.1)',
      },
      
      // Background images
      backgroundImage: {
        'grid-pattern': `linear-gradient(rgba(4, 217, 255, 0.1) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(4, 217, 255, 0.1) 1px, transparent 1px)`,
        'chrome-gradient': `linear-gradient(135deg, #A8A9AD 0%, #B4B5B8 20%, #C0C0C3 40%, #CBCCCD 60%, #D7D7D8 80%, #E3E3E3 100%)`,
      },
      
      // Background size
      backgroundSize: {
        'grid': '50px 50px',
      },
      
      // Keyframes for animations
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { 
            opacity: '1',
            boxShadow: '0 0 20px rgba(4, 217, 255, 0.4)',
          },
          '50%': { 
            opacity: '0.7',
            boxShadow: '0 0 40px rgba(4, 217, 255, 0.6)',
          },
        },
        'shine-sweep': {
          'from': { left: '-100%' },
          'to': { left: '200%' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      
      // Animations
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shine': 'shine-sweep 0.6s ease-out',
        'float': 'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
