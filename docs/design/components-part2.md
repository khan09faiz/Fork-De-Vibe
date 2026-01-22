# UI Components - Part 2

**Purpose:** MusicPersonality, ArtistLoyaltyMeter, ReadmeEditor, EmptyState

---

## MusicPersonality

**Purpose:** Display personality tags and metrics

### Structure

```typescript
interface MusicPersonalityProps {
  personality: {
    tags: string[];
    genreDiversity: number;
    repeatRate: number;
    uniqueArtists: number;
  };
}
```

### Layout

```
┌─────────────────────────────────────┐
│ Music Personality                   │
│                                     │
│ [Explorer] [Repeat Listener]        │
│ [Mainstream]                        │
│                                     │
│ Genre Diversity        75%          │
│ ████████████░░░░                    │
│                                     │
│ Repeat Rate           45%           │
│ ██████░░░░░░░░░░                    │
│                                     │
│ Unique Artists: 234                 │
└─────────────────────────────────────┘
```

### Implementation

```tsx
function MusicPersonality({ personality }: MusicPersonalityProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Music Personality</h2>
      
      <div className="flex flex-wrap gap-2 mb-6">
        {personality.tags.map(tag => (
          <span
            key={tag}
            className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-text-secondary">Genre Diversity</span>
            <span className="text-text-primary font-medium">
              {Math.round(personality.genreDiversity * 100)}%
            </span>
          </div>
          <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${personality.genreDiversity * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-text-secondary">Repeat Listener</span>
            <span className="text-text-primary font-medium">
              {Math.round(personality.repeatRate * 100)}%
            </span>
          </div>
          <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${personality.repeatRate * 100}%` }}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-bg-tertiary">
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-secondary">Unique Artists</span>
            <span className="text-2xl font-bold text-text-primary">
              {personality.uniqueArtists}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## ArtistLoyaltyMeter

**Purpose:** Show longest and current listening streaks

### Structure

```typescript
interface ArtistLoyaltyMeterProps {
  loyalty: {
    longestStreak: number;
    currentStreak: number;
    streakArtist: string | null;
  };
}
```

### Layout

```
┌─────────────────────────────────────┐
│ Artist Loyalty                      │
│                                     │
│ Longest Streak                      │
│ 🔥  12 days                         │
│     with Radiohead                  │
│                                     │
│ ─────────────────────────           │
│                                     │
│ Current Streak                      │
│ ⚡  3 days                          │
└─────────────────────────────────────┘
```

### Implementation

```tsx
function ArtistLoyaltyMeter({ loyalty }: ArtistLoyaltyMeterProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Artist Loyalty</h2>

      <div className="space-y-6">
        <div>
          <p className="text-sm text-text-secondary mb-2">Longest Streak</p>
          <div className="flex items-center gap-3">
            <span className="text-4xl">🔥</span>
            <div>
              <p className="text-3xl font-bold text-text-primary">
                {loyalty.longestStreak}
              </p>
              <p className="text-sm text-text-secondary">
                days {loyalty.streakArtist && `with ${loyalty.streakArtist}`}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-bg-tertiary pt-6">
          <p className="text-sm text-text-secondary mb-2">Current Streak</p>
          <div className="flex items-center gap-3">
            <span className="text-4xl">⚡</span>
            <div>
              <p className="text-3xl font-bold text-text-primary">
                {loyalty.currentStreak}
              </p>
              <p className="text-sm text-text-secondary">days</p>
            </div>
          </div>
        </div>

        {loyalty.currentStreak === 0 && (
          <p className="text-xs text-text-muted italic">
            Listen to the same artist multiple days in a row to start a streak
          </p>
        )}
      </div>
    </div>
  );
}
```

---

## ReadmeEditor

**Purpose:** Markdown editor with preview for profile README

### Structure

```typescript
interface ReadmeEditorProps {
  initialContent: string;
  userId: string;
}
```

### Layout

```
[Edit] [Preview]                    [Save]

┌─────────────────────────────────────┐
│ # About Me                          │
│                                     │
│ I love listening to **indie rock** │
│ and **electronic music**.           │
│                                     │
└─────────────────────────────────────┘

Markdown supported • 1,234/5,000 chars
```

### Implementation

```tsx
'use client';

import { useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

function ReadmeEditor({ initialContent, userId }: ReadmeEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSave() {
    if (content.length > 5000) {
      setMessage('README too long (max 5000 characters)');
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/user/readme', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      if (res.ok) {
        setMessage('Saved successfully');
      } else {
        setMessage('Failed to save');
      }
    } catch (error) {
      setMessage('Failed to save');
    } finally {
      setIsSaving(false);
    }
  }

  const sanitizedHtml = DOMPurify.sanitize(marked(content) as string, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'title']
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('edit')}
            className={`px-4 py-2 rounded ${
              tab === 'edit' ? 'bg-primary' : 'bg-bg-tertiary'
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => setTab('preview')}
            className={`px-4 py-2 rounded ${
              tab === 'preview' ? 'bg-primary' : 'bg-bg-tertiary'
            }`}
          >
            Preview
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-primary hover:bg-primary-hover rounded disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {tab === 'edit' ? (
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          maxLength={5000}
          className="w-full min-h-[300px] p-4 bg-bg-tertiary text-text-primary rounded resize-y font-mono text-sm"
          placeholder="# Write something about yourself..."
        />
      ) : (
        <div
          className="prose prose-invert max-w-none min-h-[300px] p-4 bg-bg-tertiary rounded"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      )}

      <div className="flex justify-between items-center mt-2">
        <p className="text-xs text-text-secondary">
          Markdown supported • {content.length}/5,000 characters
        </p>
        {message && (
          <p className="text-xs text-text-secondary">{message}</p>
        )}
      </div>
    </div>
  );
}
```

---

## EmptyState

**Purpose:** Graceful handling of no data scenarios

### Structure

```typescript
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

### Layout

```
┌─────────────────────────────────────┐
│                                     │
│           🎵                        │
│                                     │
│      No top artists yet             │
│                                     │
│  Listen to music on Spotify to      │
│  see your favorites here.           │
│                                     │
│      [Open Spotify]                 │
│                                     │
└─────────────────────────────────────┘
```

### Implementation

```tsx
function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-text-primary mb-2">
        {title}
      </h3>
      <p className="text-text-secondary mb-6 max-w-md mx-auto">
        {description}
      </p>
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
  action={{
    label: "Open Spotify",
    onClick: () => window.open('https://open.spotify.com')
  }}
/>

<EmptyState
  icon="📊"
  title="No listening history"
  description="Your listening graph will appear once you've listened to some music."
/>
```

---

**Last Updated:** January 22, 2026
