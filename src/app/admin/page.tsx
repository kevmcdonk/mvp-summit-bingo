import { getSession, isAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminDashboard from '@/components/AdminDashboard';

export default async function AdminPage() {
  const session = await getSession();
  if (!session?.user?.email) {
    redirect('/');
  }
  if (!isAdmin(session.user.email)) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-400">Access Denied</h1>
          <p className="mt-2 text-gray-400">You do not have admin privileges.</p>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
        <AdminDashboard />
      </div>
    </main>
  );
}
