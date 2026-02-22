/**
 * BORIS OS — Tailwind CSS token draft
 *
 * STATUS: Design reference only. Tailwind is NOT currently installed.
 *         This file maps the existing CSS custom-property system
 *         (src/styles/variables.css + src/ui/tokens.css) to Tailwind's
 *         configuration format, for use if Tailwind is ever adopted.
 *
 * DARK MODE STRATEGY:
 *   The existing system uses [data-theme="dark"] and @media prefers-color-scheme.
 *   Tailwind's 'selector' strategy with selector: '[data-theme="dark"]' matches this.
 *   No class-based toggling needed — existing themeEngine.js controls [data-theme].
 *
 * TO ACTIVATE:
 *   npm install -D tailwindcss @tailwindcss/vite
 *   Add @tailwindcss/vite to vite.config.js plugins
 *   Add @import "tailwindcss" at the top of a CSS entry point
 *   Replace hardcoded px values with Tailwind utilities progressively
 *
 * NOTE: The existing CSS-variable design system (variables.css → tokens.css)
 *   should be kept alongside Tailwind. Tailwind handles layout/spacing utilities;
 *   CSS variables handle theming, dark mode, and semantic aliases.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,html}',
  ],

  // ── Dark mode ────────────────────────────────────────────────────────────────
  // Mirror src/styles/variables.css: [data-theme="dark"] + @media prefers-color-scheme
  darkMode: ['selector', '[data-theme="dark"]'],

  theme: {
    extend: {

      // ── Font family ────────────────────────────────────────────────────────
      fontFamily: {
        sans: ['system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"SF Mono"', 'SFMono-Regular', 'Consolas', '"Liberation Mono"', 'Menlo', 'monospace'],
      },

      // ── Font size scale (from variables.css) ──────────────────────────────
      // Maps --font-* tokens. Base root is 15px (set in base.css).
      fontSize: {
        'xs':   ['0.6875rem', { lineHeight: '1.4' }],   // 11px — captions
        'sm':   ['0.75rem',   { lineHeight: '1.5' }],   // 12px — meta, badges
        'base': ['0.8125rem', { lineHeight: '1.5' }],   // 13px — standard body
        'md':   ['0.875rem',  { lineHeight: '1.6' }],   // 14px — primary body
        'lg':   ['0.9375rem', { lineHeight: '1.5' }],   // 15px — block titles
        'xl':   ['1.125rem',  { lineHeight: '1.4' }],   // 18px — section headings
        '2xl':  ['1.375rem',  { lineHeight: '1.3' }],   // 22px — large stats
        '3xl':  ['1.75rem',   { lineHeight: '1.25' }],  // 28px — page titles
        'stat': ['2rem',      { lineHeight: '1.2' }],   // 32px — mega metrics
      },

      // ── Spacing (4px base, from variables.css) ─────────────────────────────
      // These supplement Tailwind's default scale; prefix with 'boris-' to avoid conflicts.
      spacing: {
        '0.5':  '0.125rem',   // --space-0 = 2px
        '1':    '0.25rem',    // --space-1 = 4px
        '2':    '0.5rem',     // --space-2 = 8px
        '3':    '0.75rem',    // --space-3 = 12px
        '4':    '1rem',       // --space-4 = 16px
        '5':    '1.25rem',    // --space-5 = 20px
        '6':    '1.5rem',     // --space-6 = 24px
        '8':    '2rem',       // --space-8 = 32px
        '10':   '2.5rem',     // --space-10 = 40px
        '12':   '3rem',       // --space-12 = 48px
        '16':   '4rem',       // --space-16 = 64px
        // Layout constants
        'nav':       '56px',  // --nav-height
        'nav-sm':    '48px',  // --nav-height (compact mode)
        'sidebar':   '240px', // --sidebar-width
        'sidebar-sm':'220px', // --sidebar-width (compact mode)
      },

      // ── Colors — light mode (from variables.css :root) ────────────────────
      colors: {
        // Surface / background
        bg:            'var(--color-bg)',
        surface:       'var(--color-surface)',
        'surface-hover': 'var(--color-surface-hover)',

        // Borders
        border:        'var(--color-border)',
        'border-light':'var(--color-border-light)',

        // Text
        text: {
          DEFAULT:   'var(--color-text)',
          secondary: 'var(--color-text-secondary)',
          tertiary:  'var(--color-text-tertiary)',
        },

        // Sidebar
        sidebar: {
          bg:           'var(--color-sidebar-bg)',
          hover:        'var(--color-sidebar-hover)',
          active:       'var(--color-sidebar-active)',
          text:         'var(--color-sidebar-text)',
          'text-active':'var(--color-sidebar-text-active)',
        },

        // Primary accent (mode-aware via CSS var)
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover:   'var(--color-accent-hover)',
          light:   'var(--color-accent-light)',
          text:    'var(--color-accent-text)',
        },

        // Module palette
        blue:    { DEFAULT: '#4f6ef7', light: '#eef1fe', dark: '#6d8afb' },
        purple:  { DEFAULT: '#8b5cf6', light: '#f3effe', dark: '#a78bfa' },
        emerald: { DEFAULT: '#10b981', light: '#ecfdf5', dark: '#34d399' },
        amber:   { DEFAULT: '#f59e0b', light: '#fffbeb', dark: '#fbbf24' },
        rose:    { DEFAULT: '#f43f5e', light: '#fff1f2', dark: '#fb7185' },
        cyan:    { DEFAULT: '#06b6d4', light: '#ecfeff', dark: '#22d3ee' },
        indigo:  { DEFAULT: '#6366f1', light: '#eef2ff', dark: '#818cf8' },
        orange:  { DEFAULT: '#f97316', light: '#fff7ed', dark: '#fb923c' },
        teal:    { DEFAULT: '#14b8a6', light: '#f0fdfa', dark: '#2dd4bf' },
        pink:    { DEFAULT: '#ec4899', light: '#fdf2f8', dark: '#f472b6' },

        // Semantic
        success: { DEFAULT: 'var(--color-success)', light: 'var(--color-success-light)' },
        warning: { DEFAULT: 'var(--color-warning)', light: 'var(--color-warning-light)' },
        error:   { DEFAULT: 'var(--color-error)',   light: 'var(--color-error-light)'   },
      },

      // ── Border radius (from variables.css) ────────────────────────────────
      borderRadius: {
        sm:   '4px',    // --radius-sm
        md:   '8px',    // --radius-md
        lg:   '12px',   // --radius-lg
        xl:   '16px',   // --radius-xl
        full: '9999px', // --radius-full
      },

      // ── Box shadow (from variables.css) ───────────────────────────────────
      boxShadow: {
        sm:    '0 1px 2px rgba(0,0,0,0.04)',   // --shadow-sm
        md:    '0 2px 8px rgba(0,0,0,0.06)',   // --shadow-md
        lg:    '0 4px 16px rgba(0,0,0,0.08)', // --shadow-lg
        color: '0 2px 10px rgba(0,0,0,0.1)',  // --shadow-color
        // Dark mode variants (same keys, different opacity — handled by CSS variables)
        'sm-dark':    '0 1px 2px rgba(0,0,0,0.3)',
        'md-dark':    '0 2px 8px rgba(0,0,0,0.35)',
        'lg-dark':    '0 4px 16px rgba(0,0,0,0.4)',
      },

      // ── Transition timing (from variables.css) ────────────────────────────
      transitionTimingFunction: {
        DEFAULT:  'cubic-bezier(0.4, 0, 0.2, 1)',  // --ease
        out:      'cubic-bezier(0, 0, 0.2, 1)',    // --ease-out
        spring:   'cubic-bezier(0.34, 1.56, 0.64, 1)', // --ease-spring
      },
      transitionDuration: {
        fast: '180ms', // --duration-fast
        DEFAULT: '180ms',
        slow: '300ms', // --duration-slow
        page: '350ms', // --duration-page
      },

      // ── Max width ─────────────────────────────────────────────────────────
      maxWidth: {
        content: '900px',  // --max-content-width
        os:      '1600px', // --max-os-content-width
      },

    },
  },

  plugins: [],
};
