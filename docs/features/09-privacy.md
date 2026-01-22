# Feature: Privacy Controls

## User Story

As a user, I want to control whether my profile is public or private.

## Privacy States

### Public Profile
- Accessible to anyone at tunehub.io/{username}
- Indexed by search engines
- Shareable via link

### Private Profile
- Returns 404 to non-owners
- Owner can still access own profile
- Shows banner: "This profile is private"

## Implementation

### Database Field

```sql
ALTER TABLE users
ADD COLUMN is_public BOOLEAN DEFAULT TRUE;
```

### Settings Page

```typescript
// app/settings/page.tsx
'use client';
export default function SettingsPage() {
  const { data: session } = useSession();
  const [isPublic, setIsPublic] = useState(session?.user?.isPublic ?? true);
  
  async function togglePrivacy() {
    const res = await fetch('/api/user/privacy', {
      method: 'PATCH',
      body: JSON.stringify({ isPublic: !isPublic })
    });
    
    if (res.ok) {
      setIsPublic(!isPublic);
    }
  }
  
  return (
    <div>
      <h1>Privacy Settings</h1>
      <label>
        <input 
          type="checkbox"
          checked={isPublic}
          onChange={togglePrivacy}
        />
        Make profile public
      </label>
      <p>
        {isPublic 
          ? 'Your profile is visible to everyone' 
          : 'Your profile is private (404 to others)'}
      </p>
    </div>
  );
}
```

### API Endpoint

```typescript
// app/api/user/privacy/route.ts
export async function PATCH(req: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { isPublic } = await req.json();
  
  await db.user.update({
    where: { id: session.user.id },
    data: { isPublic }
  });
  
  // Revalidate profile page
  revalidatePath(`/[username]`, 'page');
  
  return NextResponse.json({ success: true });
}
```

### Profile Page Access Control

```typescript
// app/[username]/page.tsx
export default async function ProfilePage({ params }) {
  const session = await getServerSession();
  const user = await db.user.findUnique({
    where: { username: params.username }
  });
  
  if (!user) {
    notFound();
  }
  
  const isOwner = session?.user?.id === user.id;
  
  // If private and not owner, return 404
  if (!user.isPublic && !isOwner) {
    notFound();
  }
  
  return (
    <div>
      {!user.isPublic && isOwner && (
        <div className="banner">
          This profile is private. Only you can see it.
        </div>
      )}
      {/* Rest of profile */}
    </div>
  );
}
```

## Toggle Component

```typescript
export function PrivacyToggle({ isPublic, onChange }: Props) {
  return (
    <button
      onClick={onChange}
      className={`toggle ${isPublic ? 'active' : ''}`}
      role="switch"
      aria-checked={isPublic}
    >
      <span className="toggle-slider" />
    </button>
  );
}
```

## Acceptance Criteria

- Toggle switches instantly
- Private profiles return 404 to non-owners
- Owner sees private profile with banner
- Setting persists across sessions
- Profile page revalidated after change

## Edge Cases

### During Transition
If user is viewing their profile and makes it private, they should still see it (no redirect).

### SEO
Private profiles should have `noindex` meta tag when viewed by owner.

### Share Links
If someone shares a private profile link, recipients see 404.

## Security Considerations

- Never leak user existence (same 404 for not-found and private)
- Check authorization on server side
- No client-side privacy checks

## Edge Cases

See [Edge Cases: Security](../edge-cases/security.md)

**Last Updated:** January 22, 2026
