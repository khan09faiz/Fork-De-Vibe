# Design Guidelines

**Purpose:** Responsive design, accessibility, animations, and best practices

---

## Responsive Design

### Mobile First Approach

Start with mobile design and progressively enhance for larger screens.

```tsx
// Mobile (default)
<div className="p-4 text-sm">

// Tablet
<div className="p-4 md:p-6 text-sm md:text-base">

// Desktop
<div className="p-4 md:p-6 lg:p-8 text-sm md:text-base lg:text-lg">
```

### Breakpoint Strategy

```
Mobile:       < 640px   - Single column, stacked layout
Tablet:   640-1024px    - Two columns, compact spacing
Desktop:    > 1024px    - Multi-column, generous spacing
```

### Grid Patterns

```tsx
// Artist grid - responsive columns
<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">

// Track list - stacks on mobile
<div className="space-y-2">

// Two-column layout
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">Main content</div>
  <div>Sidebar</div>
</div>
```

---

## Accessibility

### WCAG 2.1 AA Compliance

**Color Contrast**
- Text on background: minimum 4.5:1 ratio
- Large text: minimum 3:1 ratio
- Primary color contrast verified

**Keyboard Navigation**
- All interactive elements focusable
- Logical tab order
- Visible focus indicators
- Escape closes modals

**Screen Reader Support**
- Semantic HTML
- ARIA labels on icon buttons
- Alt text on all images
- Skip to content link

### Implementation

```tsx
// Semantic HTML
<header>
  <nav>
    <ul>
      <li><a href="/">Home</a></li>
    </ul>
  </nav>
</header>

<main>
  <article>
    <h1>Profile</h1>
  </article>
</main>

// ARIA labels
<button aria-label="Close modal">
  <XIcon />
</button>

// Alt text
<img src={artist.imageUrl} alt={`${artist.name} cover art`} />

// Focus styles
<button className="focus:ring-2 focus:ring-primary focus:outline-none">
  Click me
</button>

// Skip link
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to content
</a>
```

---

## Animations

### Principles

1. **Purposeful** - Enhance UX, don't distract
2. **Fast** - 150-300ms duration
3. **Natural** - Use easing functions
4. **Optional** - Respect prefers-reduced-motion

### Transition Types

**Hover States**
```tsx
<div className="transition-colors duration-200 hover:bg-bg-tertiary">
  Card
</div>
```

**Scale on Hover**
```tsx
<img className="transition-transform duration-300 hover:scale-105" />
```

**Fade In**
```tsx
<div className="animate-fade-in opacity-0">
  Content
</div>

// Tailwind config
animation: {
  'fade-in': 'fadeIn 0.3s ease-in forwards'
}
```

**Slide In**
```tsx
<div className="animate-slide-up translate-y-4">
  Modal
</div>
```

### Respect User Preferences

```tsx
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Error Handling

### Error States

**Inline Errors**
```tsx
<input 
  className={errors.username ? 'border-error' : 'border-bg-tertiary'}
/>
{errors.username && (
  <p className="text-error text-sm mt-1">{errors.username}</p>
)}
```

**Toast Notifications**
```tsx
<Toast
  type="error"
  message="Failed to save changes"
/>
```

**Full Page Errors**
```tsx
<ErrorBoundary>
  <ProfilePage />
</ErrorBoundary>
```

---

## Loading States

### Skeleton Screens

```tsx
<div className="animate-pulse">
  <div className="h-32 bg-bg-secondary rounded-lg mb-4" />
  <div className="h-64 bg-bg-secondary rounded-lg" />
</div>
```

### Spinners

```tsx
<div className="flex items-center justify-center">
  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
</div>
```

### Progressive Loading

```tsx
{isLoading && <Skeleton />}
{!isLoading && data && <Content data={data} />}
{!isLoading && !data && <EmptyState />}
```

---

## Form Design

### Input Fields

```tsx
<input
  type="text"
  placeholder="Username"
  className="w-full px-4 py-2 bg-bg-tertiary text-text-primary border border-bg-tertiary rounded-lg focus:border-primary focus:outline-none"
/>
```

### Validation Feedback

```tsx
// Success
<div className="flex items-center gap-2 text-success">
  <CheckIcon /> Username available
</div>

// Error
<div className="flex items-center gap-2 text-error">
  <XIcon /> Username taken
</div>
```

### Submit Buttons

```tsx
<button
  disabled={isSubmitting}
  className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white py-3 rounded-lg transition-colors"
>
  {isSubmitting ? 'Saving...' : 'Save Changes'}
</button>
```

---

## Typography Scale

### Headings

```tsx
<h1 className="text-4xl font-bold">Page Title</h1>
<h2 className="text-2xl font-semibold">Section</h2>
<h3 className="text-xl font-medium">Subsection</h3>
```

### Body Text

```tsx
<p className="text-base text-text-primary">Main content</p>
<p className="text-sm text-text-secondary">Secondary</p>
<p className="text-xs text-text-muted">Label</p>
```

### Line Height

```tsx
// Headings
<h1 className="leading-tight">Tight line height</h1>

// Body
<p className="leading-normal">Normal spacing</p>

// Long form
<article className="leading-relaxed">Relaxed spacing</article>
```

---

## Spacing System

### Consistent Spacing

```tsx
// Card padding
<div className="p-6">

// Section margins
<section className="mb-8">

// Element gaps
<div className="space-y-4">
<div className="flex gap-4">
```

### White Space

- Use generous spacing between sections
- Avoid cramped layouts
- Let content breathe

---

## Performance Best Practices

### Image Optimization

```tsx
import Image from 'next/image';

<Image
  src={artist.imageUrl}
  alt={artist.name}
  width={200}
  height={200}
  loading="lazy"
/>
```

### Code Splitting

```tsx
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Spinner />
});
```

### Minimize Reflows

- Use transform instead of position changes
- Batch DOM updates
- Avoid layout thrashing

---

## Testing Checklist

### Visual Testing

- [ ] Mobile (< 640px)
- [ ] Tablet (640-1024px)
- [ ] Desktop (> 1024px)
- [ ] Dark theme only

### Interaction Testing

- [ ] All buttons clickable
- [ ] Forms validate correctly
- [ ] Loading states show
- [ ] Error states display

### Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast passes
- [ ] Focus indicators visible

---

**Last Updated:** January 22, 2026
