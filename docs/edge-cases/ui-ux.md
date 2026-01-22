# UI/UX Edge Cases

**Purpose:** Handle loading states, errors, and empty states gracefully

---

## 1. Loading States

**Problem:**
- No loading indicator while fetching data
- User thinks page is broken
- Sudden content shifts

**Impact:**
- Poor user experience
- Perceived slowness
- User abandonment

**Mitigation:**

```typescript
// Component-level loading
function ProfilePage({ username }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData().then(result => {
      setData(result);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return <ProfileContent data={data} />;
}

// Server component loading (Next.js)
// app/[username]/loading.tsx
export default function Loading() {
  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-secondary">Loading profile...</p>
      </div>
    </div>
  );
}
```

**Loading State Patterns:**

```typescript
// Skeleton loading
function SkeletonProfile() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="bg-bg-secondary rounded-lg p-6 h-32" />
      <div className="bg-bg-secondary rounded-lg p-6 h-64" />
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-bg-secondary rounded-lg h-96" />
        <div className="bg-bg-secondary rounded-lg h-96" />
      </div>
    </div>
  );
}
```

---

## 2. Empty States

**Problem:**
- No data to display
- User doesn't know why
- Dead-end experience

**Impact:**
- Confusion
- User thinks app is broken
- No call to action

**Mitigation:**

```typescript
function EmptyState({
  icon,
  title,
  description,
  action
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-text-secondary mb-6 max-w-md mx-auto">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Usage examples
<EmptyState
  icon="🎵"
  title="No top artists yet"
  description="Listen to music on Spotify to see your favorites here."
  action={{ label: "Open Spotify", onClick: () => window.open('https://open.spotify.com') }}
/>

<EmptyState
  icon="📊"
  title="No listening history"
  description="Your listening graph will appear once you've listened to some music."
/>
```

---

## 3. Error Boundaries

**Problem:**
- Component crashes
- Entire app breaks
- No error recovery

**Impact:**
- App unusable
- Lost user data
- Poor experience

**Mitigation:**

```typescript
// components/ErrorBoundary.tsx
'use client';

import { useEffect } from 'react';

export function ErrorBoundary({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-bg-secondary rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Something went wrong</h2>
        <p className="text-text-secondary mb-6">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={reset}
          className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

// app/error.tsx
'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';

export default ErrorBoundary;
```

---

## 4. Responsive Design Breakpoints

**Problem:**
- Layout breaks on mobile
- Content overflow
- Unreadable text

**Impact:**
- Poor mobile experience
- Lost mobile users

**Mitigation:**

```typescript
// Tailwind breakpoints
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px' // Extra large
};

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {artists.map(artist => (
    <ArtistCard key={artist.id} artist={artist} />
  ))}
</div>

// Responsive text
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
  Profile
</h1>

// Responsive padding
<div className="px-4 md:px-8 lg:px-12">
  {/* Content */}
</div>
```

**Mobile Testing:**
- Test on actual devices
- Use Chrome DevTools device emulator
- Test portrait and landscape
- Test different screen sizes

---

## 5. Accessibility

**Problem:**
- Not keyboard navigable
- No screen reader support
- Poor color contrast

**Impact:**
- Excludes users with disabilities
- Legal compliance issues

**Mitigation:**

```typescript
// Keyboard navigation
<button
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  className="..."
>
  Click me
</button>

// ARIA labels
<button aria-label="Close modal" onClick={onClose}>
  <XIcon />
</button>

<img src={imageUrl} alt={`${artist.name} cover art`} />

// Focus states
<button className="focus:ring-2 focus:ring-primary focus:outline-none">
  Button
</button>

// Color contrast (WCAG AA)
// Background: #1a1a1a
// Text: #ffffff (contrast ratio 18.5:1 ✅)
// Primary: #1DB954 (contrast ratio 4.5:1 ✅)
```

**Accessibility Checklist:**
- [ ] All interactive elements keyboard accessible
- [ ] All images have alt text
- [ ] Color contrast meets WCAG AA
- [ ] Focus states visible
- [ ] ARIA labels on icon buttons
- [ ] Skip to content link

---

## 6. Form Validation Feedback

**Problem:**
- No validation feedback
- Errors not clear
- Success not confirmed

**Impact:**
- User confusion
- Failed submissions
- Frustration

**Mitigation:**

```typescript
function ReadmeEditor({ initialContent }: Props) {
  const [content, setContent] = useState(initialContent);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    setErrors([]);
    setSuccess(false);

    if (content.length > 5000) {
      setErrors(['README too long (max 5000 characters)']);
      return;
    }

    try {
      await saveReadme(content);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setErrors(['Failed to save. Please try again.']);
    }
  }

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className={errors.length > 0 ? 'border-error' : ''}
      />
      
      {errors.map((error, i) => (
        <p key={i} className="text-error text-sm mt-2">{error}</p>
      ))}
      
      {success && (
        <p className="text-primary text-sm mt-2">Saved successfully!</p>
      )}
      
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

---

## 7. Infinite Scroll / Pagination

**Problem:**
- Loading all data at once
- Slow performance
- High memory usage

**Impact:**
- Slow page loads
- Poor performance
- Bad mobile experience

**Mitigation:**

```typescript
function ArtistList({ userId }: Props) {
  const [page, setPage] = useState(1);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [hasMore, setHasMore] = useState(true);

  async function loadMore() {
    const newArtists = await fetchArtists(userId, page);
    
    if (newArtists.length < 20) {
      setHasMore(false);
    }
    
    setArtists([...artists, ...newArtists]);
    setPage(page + 1);
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-4">
        {artists.map(artist => (
          <ArtistCard key={artist.id} artist={artist} />
        ))}
      </div>
      
      {hasMore && (
        <button onClick={loadMore}>Load More</button>
      )}
    </div>
  );
}
```

---

## 8. Toast Notifications

**Problem:**
- No feedback for actions
- Errors silently fail
- Success unclear

**Impact:**
- User uncertainty
- Repeated actions
- Frustration

**Mitigation:**

```typescript
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function showToast(message: string, type: 'success' | 'error' | 'info') {
    const id = Math.random().toString(36);
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }

  return { toasts, showToast };
}

// Usage
const { showToast } = useToast();

async function handleSync() {
  try {
    await syncData();
    showToast('Data synced successfully', 'success');
  } catch (error) {
    showToast('Failed to sync data', 'error');
  }
}
```

---

## UI/UX Testing Checklist

- [ ] Loading states shown for all async operations
- [ ] Empty states implemented for no data
- [ ] Error boundaries catch component crashes
- [ ] Responsive on mobile, tablet, desktop
- [ ] Keyboard navigation works
- [ ] Screen reader accessible
- [ ] Form validation clear and helpful
- [ ] Toast notifications for user actions

**Last Updated:** January 22, 2026
