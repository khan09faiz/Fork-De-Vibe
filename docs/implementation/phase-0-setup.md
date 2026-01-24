# Phase 0: Project Setup

**Duration:** 1 hour  
**Prerequisites:** Node.js 18+, npm/pnpm, Git

## Goals

- Initialize Next.js 14 project with TypeScript
- Install all required dependencies
- Configure environment variables
- Set up Git repository
- Verify development environment

## Step 1: Create Next.js Project

```bash
npx create-next-app@latest tunehub --typescript --tailwind --app --eslint
cd tunehub
```

When prompted:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: No
- App Router: Yes
- Import alias: Yes (@/*)

## Step 2: Install Dependencies

```bash
npm install @prisma/client next-auth@^4.24.7
npm install -D prisma
npm install isomorphic-dompurify marked
npm install recharts
npm install date-fns
```

### Dependency Overview

| Package | Purpose |
|---------|---------|
| @prisma/client | Database ORM |
| next-auth | Authentication |
| isomorphic-dompurify | XSS sanitization |
| marked | Markdown parsing |
| recharts | Data visualization |
| date-fns | Date utilities |

## Step 3: Project Structure

Create the following directories:

```bash
mkdir -p app/api/auth/[...nextauth]
mkdir -p app/api/spotify
mkdir -p app/api/user
mkdir -p app/[username]
mkdir -p components
mkdir -p lib/spotify
mkdir -p lib/utils
mkdir -p prisma
mkdir -p types
```

## Step 4: Environment Variables

Create `.env.local`:

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/tunehub_dev"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Spotify OAuth
SPOTIFY_CLIENT_ID="your-spotify-client-id"
SPOTIFY_CLIENT_SECRET="your-spotify-client-secret"
```

### Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

## Step 5: Spotify App Registration

1. Go to https://developer.spotify.com/dashboard
2. Click "Create app"
3. Fill in details:
   - App name: TuneHub Development
   - App description: Music profile app
   - Website: http://localhost:3000
   - Redirect URIs: http://localhost:3000/api/auth/callback/spotify
4. Check "Web API"
5. Save and copy Client ID and Client Secret to `.env.local`

## Step 6: Configure Tailwind

Update `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1DB954',
        'primary-hover': '#1ed760',
        'primary-dark': '#1aa34a',
        'bg-dark': '#121212',
        'bg-secondary': '#181818',
        'bg-tertiary': '#282828',
        'text-primary': '#FFFFFF',
        'text-secondary': '#B3B3B3',
        'text-muted': '#6B6B6B'
      }
    }
  },
  plugins: []
};

export default config;
```

## Step 7: TypeScript Configuration

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## Step 8: Create Type Definitions

Create `types/next-auth.d.ts`:

```typescript
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image: string;
    };
    accessToken?: string;
    error?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    spotifyId?: string;
    error?: string;
  }
}
```

## Step 9: Git Setup

Create `.gitignore`:

```
# dependencies
node_modules
.pnp
.pnp.js

# testing
coverage

# next.js
.next
out
build
dist

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# database
prisma/.env
```

Initialize Git:

```bash
git init
git add .
git commit -m "Initial commit: Next.js project setup"
```

## Step 10: Verify Setup

Run development server:

```bash
npm run dev
```

Visit http://localhost:3000 - you should see the Next.js welcome page.

## Checklist

- [ ] Next.js 14 project created
- [ ] All dependencies installed
- [ ] Environment variables configured
- [ ] Spotify app registered
- [ ] Tailwind colors configured
- [ ] TypeScript types defined
- [ ] Git initialized
- [ ] Dev server runs without errors

## Common Issues

**Issue:** npm install fails
**Solution:** Delete node_modules and package-lock.json, run `npm install` again

**Issue:** Spotify redirect URI mismatch
**Solution:** Verify exact match in Spotify Dashboard (include trailing slash)

**Issue:** NEXTAUTH_SECRET error
**Solution:** Generate new secret with `openssl rand -base64 32`

## Next Phase

