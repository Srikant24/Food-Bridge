/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cohesive FoodBridge Design System
        cream: {
          DEFAULT: '#F7F3E9', // Warm Cream (Primary Canvas)
          50: '#FFFCF7',
          100: '#FAF6EE',
          200: '#F7F3E9',
          300: '#EDE5D4',
          400: '#E1D5BF',
          500: '#D2C1A5',
        },
        forest: {
          DEFAULT: '#174C35', // Forest Green (Primary Brand & Accent)
          50: '#F2F7F4',
          100: '#E2ECE7',
          200: '#C2D7CE',
          300: '#9DBFB1',
          400: '#548F73',
          500: '#2A6B4E',
          600: '#174C35', // Core Forest
          700: '#133E2B',
          800: '#0F3022',
          900: '#0B2218',
          950: '#06140E',
        },
        darkink: {
          DEFAULT: '#19242B', // Dark Ink (Primary Headings & High-Contrast Text)
          50: '#F4F6F7',
          100: '#E4E8EB',
          200: '#C5CED4',
          300: '#9EACB5',
          400: '#6B7E8A',
          500: '#475761',
          600: '#323E45',
          700: '#232C32',
          800: '#19242B', // Core Dark Ink
          900: '#10171B',
          950: '#0A0E11',
        },
        charcoal: {
          DEFAULT: '#19242B',
          50: '#F4F6F7',
          100: '#E4E8EB',
          200: '#C5CED4',
          300: '#9EACB5',
          400: '#6B7E8A',
          500: '#475761',
          600: '#323E45',
          700: '#232C32',
          800: '#19242B',
          900: '#10171B',
          950: '#0A0E11',
        },
        apricot: {
          DEFAULT: '#E4A45D', // Apricot (Primary Warm CTA & Accents)
          50: '#FDF9F3',
          100: '#FBF0E2',
          200: '#F7DEC0',
          300: '#F1C798',
          400: '#EAB273',
          500: '#E4A45D', // Core Apricot
          600: '#D58A38',
          700: '#B06922',
          800: '#8A4F19',
          900: '#633711',
        },
        terracotta: {
          DEFAULT: '#E4A45D', // Aliased to Apricot for backward compatibility
          500: '#E4A45D',
          600: '#D58A38',
          700: '#B06922',
        },
        sage: {
          DEFAULT: '#DCE9D8', // Soft Sage (Subtle backgrounds & accents)
          50: '#F8FAF7',
          100: '#EFF5EE',
          200: '#DCE9D8', // Core Sage
          300: '#C5DCC0',
          400: '#A9CBA2',
          500: '#8FB887',
          600: '#729A6B',
          700: '#567750',
          800: '#3D5438',
          900: '#263423',
        },
        honey: {
          DEFAULT: '#F2C66D', // Honey Yellow (Warm highlights, badges, tickers)
          50: '#FEFAF0',
          100: '#FDF3DC',
          200: '#FBE6B6',
          300: '#F7D78E',
          400: '#F2C66D', // Core Honey
          500: '#E4B14C',
          600: '#C79330',
          700: '#9E711E',
          800: '#735015',
          900: '#4B330C',
        },
        warmwhite: {
          DEFAULT: '#FFFCF7', // Clean Card Surface
          50: '#FFFFFF',
          100: '#FFFCF7',
          200: '#FAF6EE',
          300: '#F5EFE1',
        },
        // Supporting aliases for backward compatibility across components
        olive: {
          DEFAULT: '#174C35', // Map to primary Forest Green
          50: '#F2F7F4',
          100: '#E2ECE7',
          200: '#C2D7CE',
          500: '#2A6B4E',
          600: '#174C35',
          700: '#133E2B',
          800: '#0F3022',
        },
        forestink: {
          DEFAULT: '#19242B',
          800: '#19242B',
          900: '#10171B',
        },
        lime: {
          DEFAULT: '#DCE9D8',
          50: '#F8FAF7',
          100: '#EFF5EE',
          200: '#DCE9D8',
          300: '#C5DCC0',
          400: '#A9CBA2',
          500: '#8FB887',
          800: '#174C35',
        },
        offwhite: '#F7F3E9',
        ivory: '#F7F3E9',
        navy: '#19242B',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        heading: ['"DM Serif Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'warm': '0 4px 20px -2px rgba(38, 56, 43, 0.08)',
        'warm-hover': '0 12px 32px -4px rgba(38, 56, 43, 0.14)',
        'card': '0 2px 12px 0 rgba(38, 56, 43, 0.05)',
        'editorial': '0 20px 40px -15px rgba(38, 56, 43, 0.18)',
        'glass': '0 4px 20px -2px rgba(38, 56, 43, 0.06)',
        'glass-hover': '0 12px 28px -4px rgba(38, 56, 43, 0.10)',
        'soft': '0 2px 8px 0 rgba(38, 56, 43, 0.05)',
        'cta': '0 8px 24px -4px rgba(224, 120, 79, 0.35)',
      },
      borderRadius: {
        'editorial': '1rem',
      }
    },
  },
  plugins: [],
}
