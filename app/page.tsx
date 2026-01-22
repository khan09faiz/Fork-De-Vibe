import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4 text-primary">
          Fork-De-Vibe
        </h1>
        <p className="text-2xl text-text-secondary mb-8">
          GitHub for Spotify
        </p>
        <p className="text-text-muted mb-8">
          Track your music listening history and discover your musical identity
        </p>
        
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="bg-primary hover:bg-primary-hover text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/dashboard"
            className="bg-bg-secondary hover:bg-bg-tertiary text-white font-semibold py-3 px-8 rounded-lg transition-colors border border-text-muted"
          >
            Dashboard
          </Link>
        </div>

        <div className="mt-8 space-y-2 text-sm text-text-muted">
          <p>✓ Phase 0: Setup Complete</p>
          <p>✓ Phase 1: Database Complete</p>
          <p className="text-primary">→ Phase 2: Authentication Ready</p>
        </div>
      </div>
    </main>
  )
}
