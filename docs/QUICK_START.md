# TuneHub Quick Start Guide
## Get Up and Running in 5 Minutes

---

## ⚡ PREREQUISITES

Before starting, ensure you have:

- [ ] **Node.js 18+** installed ([Download](https://nodejs.org/))
- [ ] **npm** or **pnpm** package manager
- [ ] **Git** installed
- [ ] **Spotify Account** (free tier is fine)
- [ ] **Code Editor** (VS Code recommended)
- [ ] **PostgreSQL** (or Supabase account for cloud database)

---

## 🚀 5-MINUTE SETUP

### Step 1: Clone & Install (1 min)

```bash
# Clone repository (or create new project)
git clone <your-repo-url> tunehub
cd tunehub

# Install dependencies
npm install
```

### Step 2: Register Spotify App (2 min)

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click **"Create App"**
3. Fill in:
   - **App Name:** TuneHub
   - **App Description:** GitHub for Music Taste
   - **Redirect URI:** `http://localhost:3000/api/auth/callback/spotify`
   - **APIs used:** Web API
   - **Scopes:** user-read-email, user-read-private, user-top-read, user-read-recently-played
4. Click **"Save"**
5. Copy **Client ID** and **Client Secret** (click "Show Client Secret")

**Note:** Spotify API automatically provides user's country during authentication. This data is saved to the database for:
- Country-specific leaderboards in quiz system
- Concert discovery in user's region
- No manual location input required!

### Step 3: Setup Environment Variables (1 min)

```bash
# Create .env.local file
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Database (Option A: Supabase - see Step 4)
DATABASE_URL="postgresql://user:password@localhost:5432/tunehub"

# Spotify OAuth (from Step 2)
SPOTIFY_CLIENT_ID="your_client_id_here"
SPOTIFY_CLIENT_SECRET="your_client_secret_here"

# NextAuth (generate random string)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
```

**Generate NEXTAUTH_SECRET:**
```bash
# On Mac/Linux
openssl rand -base64 32

# On Windows PowerShell
-join ((65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

### Step 4: Setup Database (1 min)

**Option A: Supabase (Recommended - Free)**

1. Go to [Supabase](https://supabase.com)
2. Create account & new project
3. Go to **Settings > Database**
4. Copy **Connection String** (Transaction mode)
5. Paste into `.env.local` as `DATABASE_URL`

**Option B: Local PostgreSQL**

```bash
# Mac (with Homebrew)
brew install postgresql
brew services start postgresql
createdb tunehub

# Your DATABASE_URL:
# postgresql://localhost:5432/tunehub
```

### Step 5: Initialize Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Verify connection
npx prisma studio  # Opens database browser at http://localhost:5555
```

### Step 6: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## ✅ VERIFY SETUP

### Test Checklist

- [ ] Development server runs without errors
- [ ] Can access http://localhost:3000
- [ ] See landing page or "Sign in with Spotify" button
- [ ] Click "Sign in" → redirects to Spotify OAuth
- [ ] After authorizing → redirects back to app
- [ ] User record created in database (check Prisma Studio)

### If You See Errors

**Error: "Cannot connect to database"**
- Check `DATABASE_URL` in `.env.local`
- Verify database is running
- Test connection: `npx prisma db push`

**Error: "Invalid client_id"**
- Check `SPOTIFY_CLIENT_ID` in `.env.local`
- Verify it matches Spotify Dashboard

**Error: "Redirect URI mismatch"**
- Go to Spotify Dashboard → Your App → Settings
- Add: `http://localhost:3000/api/auth/callback/spotify`
- Save changes

**Error: "NEXTAUTH_SECRET not set"**
- Generate secret (see Step 3)
- Add to `.env.local`

---

## 📁 PROJECT STRUCTURE

After setup, you should see:

```
tunehub/
├── app/                 # Next.js App Router pages
├── components/          # React components (create as you build)
├── lib/                 # Core logic (create as you build)
├── pages/api/auth/      # NextAuth routes (create in Phase 2)
├── prisma/              
│   ├── schema.prisma    # ✅ Database schema
│   └── migrations/      # ✅ Migration files
├── public/              # Static assets
├── types/               # TypeScript types (create as you build)
├── .env.local           # ✅ Your environment variables
├── .env.example         # Template
├── next.config.js       # Next.js config
├── package.json         # Dependencies
├── tailwind.config.ts   # Tailwind config
└── tsconfig.json        # TypeScript config
```

---

## 🎯 NEXT STEPS

### Now that setup is complete:

1. **Read Architecture** → [docs/architecture](architecture)  
   Understand folder structure and data flow

2. **Start Implementation** → [docs/instructions](instructions)  
   Begin with **Phase 2: Authentication**

3. **Reference During Build:**
   - [docs/features](features) - What to build
   - [docs/design](design) - How it should look
   - [docs/edge_cases.md](edge_cases.md) - Avoid common pitfalls

---

## 🛠️ DEVELOPMENT WORKFLOW

### Typical Development Cycle

```bash
# 1. Start dev server
npm run dev

# 2. Make changes to code

# 3. Database changes? Run migration
npx prisma migrate dev --name your_change_name

# 4. See TypeScript errors? Check types
npm run type-check

# 5. Format code
npm run format

# 6. Commit changes
git add .
git commit -m "feat: your feature name"
```

### Useful Commands

```bash
# Database
npx prisma studio          # Open database browser
npx prisma db push         # Push schema changes (dev only)
npx prisma migrate dev     # Create migration
npx prisma generate        # Regenerate Prisma Client

# Development
npm run dev                # Start dev server
npm run build              # Build for production
npm run start              # Run production build
npm run lint               # Run ESLint
npm run type-check         # Check TypeScript errors

# Testing (after setting up tests)
npm run test               # Run tests
npm run test:watch         # Run tests in watch mode
```

---

## 🐛 TROUBLESHOOTING

### Common Issues

**Port 3000 already in use**
```bash
# Kill process using port 3000
# Mac/Linux:
lsof -ti:3000 | xargs kill -9

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Prisma Client out of sync**
```bash
npx prisma generate
```

**Environment variables not loading**
- Restart development server after changing `.env.local`
- Verify file is named `.env.local` not `.env.local.txt`

**Spotify OAuth not working**
- Clear browser cache/cookies
- Check Redirect URI in Spotify Dashboard
- Verify `NEXTAUTH_URL` in `.env.local`

---

## 📚 RESOURCES

### Documentation
- **Project Docs:** [docs/INDEX.md](INDEX.md)
- **API Reference:** [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- **Framework Docs:** [Next.js](https://nextjs.org/docs)

### Community
- GitHub Issues: (Add your repo's issues URL)
- Discussions: (Add your repo's discussions URL)

---

## 🎉 YOU'RE READY!

Setup is complete! Now you can:

1. Test signing in with Spotify
2. Explore the database in Prisma Studio
3. Start building features (follow [instructions](instructions))

---

**Need Help?**
- Check [edge_cases.md](edge_cases.md) for known issues
- Review [architecture](architecture) for system overview
- Re-read setup steps above

**Last Updated:** January 22, 2026
