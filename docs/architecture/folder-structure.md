# Folder Structure

**Purpose:** Detailed explanation of project organization

---

## Root Structure

```
tunehub/
├── app/                    # Next.js App Router
├── components/             # React components
├── lib/                    # Utility functions
├── prisma/                 # Database schema & migrations
├── public/                 # Static assets
├── docs/                   # Documentation
├── .env.local              # Environment variables
├── next.config.js          # Next.js configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies
```

---

## App Directory (Next.js 14)

```
app/
├── (auth)/                 # Auth route group
│   └── login/
│       └── page.tsx        # Login page
├── [username]/             # Dynamic profile route
│   ├── page.tsx            # Profile page (Server Component)
│   ├── loading.tsx         # Loading state
│   └── not-found.tsx       # 404 page
├── api/                    # API routes
│   ├── auth/
│   │   └── [...nextauth]/
│   │       └── route.ts    # NextAuth handler
│   ├── spotify/
│   │   ├── sync/
│   │   │   └── route.ts    # Data sync endpoint
│   │   └── top/
│   │       └── route.ts    # Fetch top data
│   └── user/
│       ├── privacy/
│       │   └── route.ts    # Update privacy
│       └── readme/
│           └── route.ts    # Update README
├── settings/
│   └── page.tsx            # Settings page
├── dashboard/
│   └── page.tsx            # User dashboard
├── layout.tsx              # Root layout
├── page.tsx                # Home page
├── error.tsx               # Global error boundary
├── loading.tsx             # Global loading
└── globals.css             # Global styles
```

---

## Components Directory

```
components/
├── profile/
│   ├── ProfileHeader.tsx
│   ├── ListeningGraph.tsx
│   ├── TopArtistsGrid.tsx
│   ├── TopTracksGrid.tsx
│   ├── MusicPersonality.tsx
│   └── ArtistLoyaltyMeter.tsx
├── editor/
│   ├── ReadmeEditor.tsx
│   └── PrivacyToggle.tsx
├── ui/
│   ├── EmptyState.tsx
│   ├── LoadingSpinner.tsx
│   ├── ErrorBoundary.tsx
│   └── Toast.tsx
└── layout/
    ├── Header.tsx
    └── Footer.tsx
```

---

## Lib Directory

```
lib/
├── auth/
│   ├── auth-options.ts     # NextAuth configuration
│   └── get-current-user.ts # Helper to get session
├── spotify/
│   ├── client.ts           # Spotify API client
│   ├── fetch-top-artists.ts
│   ├── fetch-top-tracks.ts
│   └── fetch-recently-played.ts
├── calculations/
│   ├── personality.ts      # Music personality algorithm
│   ├── loyalty.ts          # Artist loyalty calculation
│   └── compute-all.ts      # Combined computation
├── utils/
│   ├── cache.ts            # Cache helpers
│   ├── date.ts             # Date utilities
│   └── format.ts           # Formatting helpers
└── db.ts                   # Prisma client instance
```

---

## Prisma Directory

```
prisma/
├── schema.prisma           # Database schema
├── migrations/             # Migration history
│   ├── 20240101_init/
│   │   └── migration.sql
│   ├── 20240102_add_personality/
│   │   └── migration.sql
│   └── migration_lock.toml
└── seed.ts                 # Seed data (optional)
```

---

## Key File Purposes

### app/[username]/page.tsx
**Purpose:** Dynamic profile page  
**Type:** Server Component  
**Features:**
- ISR with 1-hour revalidation
- Fetch user data from database
- Check privacy settings
- Render profile components

### app/api/auth/[...nextauth]/route.ts
**Purpose:** Authentication handler  
**Features:**
- Spotify OAuth flow
- Token refresh logic
- Session management
- JWT encryption

### lib/spotify/client.ts
**Purpose:** Spotify API wrapper  
**Features:**
- Rate limiting
- Error handling
- Token management
- Retry logic

### lib/calculations/personality.ts
**Purpose:** Music personality algorithm  
**Features:**
- Shannon entropy calculation
- Tag assignment
- Genre diversity
- Repeat rate

---

## Environment Files

### .env.local (Development)
```
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
SPOTIFY_CLIENT_ID="..."
SPOTIFY_CLIENT_SECRET="..."
```

### .env.production (Vercel)
```
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="https://tunehub.vercel.app"
NEXTAUTH_SECRET="..."
SPOTIFY_CLIENT_ID="..."
SPOTIFY_CLIENT_SECRET="..."
```

---

## Configuration Files

### next.config.js
```javascript
module.exports = {
  images: {
    domains: ['i.scdn.co', 'mosaic.scdn.co']
  },
  experimental: {
    serverActions: true
  }
};
```

### tailwind.config.js
```javascript
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1DB954',
        'bg-dark': '#0d1117',
        'bg-secondary': '#161b22'
      }
    }
  }
};
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

---

## Import Patterns

### Absolute Imports
```typescript
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
```

### Relative Imports (within same feature)
```typescript
import { calculateEntropy } from './entropy';
import { assignTags } from './tags';
```

---

**Last Updated:** January 22, 2026
