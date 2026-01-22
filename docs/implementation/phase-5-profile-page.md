# Phase 5: Profile Page Implementation

**Duration:** 4 hours  
**Prerequisites:** Phase 4 complete, synced data available

## Goals

- Build public profile page at /{username}
- Implement ISR caching
- Add privacy controls
- Display all data sections
- Handle edge cases

## Step 1: Profile Page

Create `app/[username]/page.tsx`:

```typescript
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { db } from '@/lib/db';
import { getCachedTopArtists, getCachedTopTracks, getListeningHistory } from '@/lib/utils/cache';

export const revalidate = 3600;

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const session = await getServerSession(authOptions);
  
  const user = await db.user.findUnique({
    where: { username: params.username },
    include: { personality: true }
  });

  if (!user) notFound();

  const isOwner = session?.user?.id === user.id;
  if (!user.isPublic && !isOwner) notFound();

  const [topArtists, topTracks, listeningHistory] = await Promise.all([
    getCachedTopArtists(user.id, 'short_term'),
    getCachedTopTracks(user.id, 'short_term'),
    getListeningHistory(user.id, 365)
  ]);

  return (
    <div className="min-h-screen bg-bg-dark">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!user.isPublic && isOwner && (
          <div className="mb-4 p-4 bg-warning/10 border border-warning rounded-lg">
            <p className="text-warning">This profile is private. Only you can see it.</p>
          </div>
        )}

        <div className="bg-bg-secondary rounded-lg p-6 mb-6 flex items-center gap-4">
          {user.imageUrl && (
            <img src={user.imageUrl} alt={user.username} className="w-20 h-20 rounded-full" />
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white">{user.username}</h1>
            {user.displayName && (
              <p className="text-lg text-text-secondary">@{user.displayName}</p>
            )}
          </div>
          {isOwner && (
            <a href="/settings" className="px-4 py-2 bg-bg-tertiary hover:bg-primary rounded-lg transition-colors">
              Settings
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-bg-secondary rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Listening Activity (Past Year)</h2>
              <div className="text-center py-8 text-text-secondary">
                Graph component goes here
              </div>
            </div>

            {topArtists && topArtists.length > 0 && (
              <div className="bg-bg-secondary rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Top Artists</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {topArtists.slice(0, 8).map(artist => (
                    <div key={artist.id}>
                      {artist.imageUrl && (
                        <img src={artist.imageUrl} alt={artist.name} className="w-full rounded-lg mb-2" />
                      )}
                      <p className="text-sm font-medium truncate">{artist.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {user.personality && (
              <div className="bg-bg-secondary rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Music Personality</h2>
                <div className="flex flex-wrap gap-2">
                  {user.personality.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-bg-secondary rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Stats</h2>
              <div className="space-y-2 text-text-secondary">
                <p>Listening days: {listeningHistory.length}</p>
                <p>Total minutes: {listeningHistory.reduce((sum, d) => sum + d.minutes, 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {user.profileReadme && (
          <div className="mt-6 bg-bg-secondary rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">About</h2>
            <div className="prose prose-invert max-w-none">
              {user.profileReadme}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

## Step 2: Generate Static Params

Add to `app/[username]/page.tsx`:

```typescript
export async function generateStaticParams() {
  const users = await db.user.findMany({
    where: { isPublic: true },
    select: { username: true },
    take: 100
  });

  return users.map(user => ({
    username: user.username
  }));
}
```

## Step 3: Metadata for SEO

Add to `app/[username]/page.tsx`:

```typescript
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const user = await db.user.findUnique({
    where: { username: params.username }
  });

  if (!user) {
    return { title: 'User Not Found' };
  }

  return {
    title: `${user.username} - TuneHub`,
    description: `Check out ${user.username}'s music listening stats on TuneHub`,
    openGraph: {
      title: `${user.username} - TuneHub`,
      description: `${user.username}'s music profile`,
      images: user.imageUrl ? [user.imageUrl] : []
    }
  };
}
```

## Step 4: Settings Page

Create `app/settings/page.tsx`:

```typescript
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { PrivacyToggle } from '@/components/PrivacyToggle';
import { ReadmeEditor } from '@/components/ReadmeEditor';
import { db } from '@/lib/db';

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const userData = await db.user.findUnique({
    where: { id: user.id }
  });

  return (
    <div className="min-h-screen bg-bg-dark p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

        <div className="space-y-6">
          <div className="bg-bg-secondary rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Privacy</h2>
            <PrivacyToggle isPublic={userData?.isPublic ?? true} userId={user.id} />
          </div>

          <div className="bg-bg-secondary rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Profile README</h2>
            <ReadmeEditor initialContent={userData?.profileReadme || ''} userId={user.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Step 5: Privacy Toggle Component

Create `components/PrivacyToggle.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PrivacyToggle({ isPublic: initial, userId }: { isPublic: boolean; userId: string }) {
  const [isPublic, setIsPublic] = useState(initial);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleToggle() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/user/privacy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !isPublic })
      });

      if (res.ok) {
        setIsPublic(!isPublic);
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to update privacy:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">Public Profile</p>
        <p className="text-sm text-text-secondary">
          {isPublic ? 'Your profile is visible to everyone' : 'Your profile is private'}
        </p>
      </div>
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          isPublic ? 'bg-primary' : 'bg-bg-tertiary'
        } disabled:opacity-50`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isPublic ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
```

## Step 6: Privacy API Endpoint

Create `app/api/user/privacy/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { isPublic } = await req.json();

  const user = await db.user.update({
    where: { id: session.user.id },
    data: { isPublic }
  });

  revalidatePath(`/[username]`, 'page');

  return NextResponse.json({ success: true, isPublic: user.isPublic });
}
```

## Step 7: Not Found Page

Create `app/[username]/not-found.tsx`:

```typescript
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <p className="text-xl text-text-secondary mb-8">User not found</p>
        <Link
          href="/"
          className="inline-block bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
```

## Step 8: Home Page Redirect

Update `app/page.tsx`:

```typescript
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    const userData = await db.user.findUnique({
      where: { id: user.id }
    });
    
    if (userData) {
      redirect(`/${userData.username}`);
    }
  }

  redirect('/login');
}
```

## Checklist

- [ ] Profile page created at /{username}
- [ ] Privacy controls working
- [ ] ISR caching enabled (1 hour)
- [ ] Static params generated for top 100 users
- [ ] SEO metadata included
- [ ] Settings page functional
- [ ] Privacy toggle works
- [ ] 404 page shows for missing users
- [ ] Home redirects appropriately

## Testing

1. Sign in and sync data
2. Visit your profile at /yourusername
3. Verify all sections display
4. Toggle privacy to private
5. Sign out and try to access profile (should 404)
6. Sign back in and access (should work)
7. Toggle back to public
8. Sign out and verify public access works

## Common Issues

**Issue:** Profile shows old data
**Solution:** Clear ISR cache: `rm -rf .next/cache`

**Issue:** 404 on public profile
**Solution:** Check `isPublic` field in database

**Issue:** Settings not saving
**Solution:** Check API endpoint returns success

## Next Phase

Continue to [Phase 6: UI Components](phase-6-components.md)

**Last Updated:** January 22, 2026
