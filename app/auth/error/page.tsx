'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration.',
    AccessDenied: 'You denied access to your Spotify account.',
    Verification: 'The verification token has expired or already been used.',
    Default: 'An unexpected error occurred during authentication.'
  };

  const message = errorMessages[error || 'Default'] || errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-dark px-4">
      <div className="max-w-md w-full bg-bg-secondary rounded-lg shadow-xl p-8 text-center">
        <div className="text-6xl mb-4">⚠</div>
        <h1 className="text-2xl font-bold text-white mb-4">Authentication Error</h1>
        <p className="text-text-secondary mb-8">{message}</p>
        <Link
          href="/login"
          className="inline-block bg-primary hover:bg-primary-hover text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Try Again
        </Link>
      </div>
    </div>
  );
}
