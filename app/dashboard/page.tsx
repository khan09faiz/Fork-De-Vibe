import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.id }
  });

  return (
    <div className="min-h-screen bg-bg-dark p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-4">Dashboard</h1>
        <p className="text-text-secondary mb-8">Welcome, {user.name}!</p>
        
        <div className="bg-bg-secondary rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Session Info</h2>
          <pre className="text-sm text-text-secondary overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <div className="bg-bg-secondary rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Database User</h2>
          <pre className="text-sm text-text-secondary overflow-auto">
            {JSON.stringify(dbUser, null, 2)}
          </pre>
        </div>

        <div className="mt-6">
          <p className="text-primary font-semibold">✓ Phase 2: Authentication Complete</p>
        </div>
      </div>
    </div>
  );
}
