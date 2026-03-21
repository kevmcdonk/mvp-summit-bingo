import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import BingoBoard from '@/components/BingoBoard';

export default async function PlayPage() {
  const session = await getSession();
  if (!session) {
    redirect('/');
  }
  return (
    <main className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">🎱 MVP Summit Bingo</h1>
          <span className="text-sm text-gray-400">{session.user?.name}</span>
        </div>
        <BingoBoard />
      </div>
    </main>
  );
}
