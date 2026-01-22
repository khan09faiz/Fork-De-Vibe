# Design System

**Purpose:** Colors, typography, spacing, and design tokens

---

## Color Palette

### Primary Colors

```css
--primary: #1DB954;           /* Spotify green */
--primary-hover: #1ed760;     /* Hover state */
--primary-dark: #169c46;      /* Active state */
```

### Background Colors (Dark Theme)

```css
--bg-dark: #0d1117;           /* Main background */
--bg-secondary: #161b22;      /* Cards, panels */
--bg-tertiary: #21262d;       /* Hover states */
```

### Text Colors

```css
--text-primary: #e6edf3;      /* Main text */
--text-secondary: #8b949e;    /* Secondary text */
--text-muted: #6e7681;        /* Disabled text */
```

### Semantic Colors

```css
--success: #28a745;
--warning: #ffc107;
--error: #dc3545;
--info: #17a2b8;
```

### Listening Activity Colors

```css
--activity-0: #161b22;        /* No activity */
--activity-1: #0e4429;        /* 1-30 minutes */
--activity-2: #006d32;        /* 31-60 minutes */
--activity-3: #26a641;        /* 61-90 minutes */
--activity-4: #39d353;        /* 90+ minutes */
```

---

## Typography

### Font Stack

```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
             'Noto Sans', Helvetica, Arial, sans-serif;
--font-mono: 'SF Mono', Monaco, Consolas, 'Courier New', monospace;
```

### Font Sizes

```css
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
```

### Font Weights

```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Line Heights

```css
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

---

## Spacing Scale

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

---

## Border Radius

```css
--radius-sm: 0.25rem;   /* 4px */
--radius-md: 0.375rem;  /* 6px */
--radius-lg: 0.5rem;    /* 8px */
--radius-xl: 0.75rem;   /* 12px */
--radius-full: 9999px;  /* Fully rounded */
```

---

## Shadows

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
```

---

## Breakpoints

```css
--screen-sm: 640px;    /* Mobile landscape */
--screen-md: 768px;    /* Tablet */
--screen-lg: 1024px;   /* Desktop */
--screen-xl: 1280px;   /* Large desktop */
--screen-2xl: 1536px;  /* Extra large */
```

### Usage in Tailwind

```html
<div class="text-sm md:text-base lg:text-lg">
  Responsive text
</div>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
  Responsive grid
</div>
```

---

## Z-Index Scale

```css
--z-dropdown: 1000;
--z-sticky: 1020;
--z-fixed: 1030;
--z-modal-backdrop: 1040;
--z-modal: 1050;
--z-popover: 1060;
--z-tooltip: 1070;
```

---

## Transitions

```css
--transition-fast: 150ms ease-in-out;
--transition-base: 200ms ease-in-out;
--transition-slow: 300ms ease-in-out;
```

### Usage

```css
.button {
  transition: background-color var(--transition-base);
}

.card {
  transition: transform var(--transition-fast),
              box-shadow var(--transition-fast);
}
```

---

## Component Patterns

### Card

```css
.card {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}
```

### Button Primary

```css
.button-primary {
  background: var(--primary);
  color: white;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  transition: background-color var(--transition-base);
}

.button-primary:hover {
  background: var(--primary-hover);
}
```

### Button Secondary

```css
.button-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  transition: background-color var(--transition-base);
}

.button-secondary:hover {
  background: var(--bg-dark);
}
```

---

## Tailwind Configuration

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#1DB954',
        'bg-dark': '#0d1117',
        'bg-secondary': '#161b22',
        'bg-tertiary': '#21262d',
        'text-primary': '#e6edf3',
        'text-secondary': '#8b949e'
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Consolas', 'monospace']
      }
    }
  }
};
```

---

**Last Updated:** January 22, 2026
