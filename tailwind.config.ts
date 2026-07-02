import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Zempac design tokens (Lumina Vision Light)
        primary: {
          DEFAULT: '#0040DF',
          container: '#2D5BFF',
          fg: '#FFFFFF'
        },
        secondary: {
          DEFAULT: '#4959A3',
          container: '#9FAFFF'
        },
        tertiary: {
          DEFAULT: '#993100',
          container: '#C24100'
        },
        danger: {
          DEFAULT: '#BA1A1A',
          container: '#FFDAD6'
        },
        surface: {
          DEFAULT: '#F8F9FA',
          lowest: '#FFFFFF',
          low: '#F3F4F5',
          mid: '#EDEEEF',
          high: '#E7E8E9',
          highest: '#E1E3E4'
        },
        ink: {
          DEFAULT: '#191C1D',
          variant: '#434656'
        },
        outline: {
          DEFAULT: '#747688',
          variant: '#C4C5D9'
        },
        positive: {
          bg: '#E6F4EA',
          fg: '#137333'
        },
        negative: {
          bg: '#FCE8E6',
          fg: '#C5221F'
        }
      },
      fontFamily: {
        sans: ['var(--font-manrope)', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        card: '20px',
        pill: '9999px'
      },
      boxShadow: {
        card: '0 12px 48px 0 rgba(25, 28, 29, 0.04)',
        cta: '0 6px 16px 0 rgba(0, 64, 223, 0.2)'
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, #2D5BFF 0%, #0040DF 100%)',
        'cta-gradient': 'linear-gradient(135deg, #0040DF 0%, #2D5BFF 100%)'
      },
      letterSpacing: {
        eyebrow: '0.1em'
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        'loading-sweep': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(250%)' }
        }
      },
      animation: {
        shimmer: 'shimmer 1.8s ease-in-out infinite',
        'loading-sweep': 'loading-sweep 1.15s ease-in-out infinite'
      }
    }
  },
  plugins: []
};

export default config;
