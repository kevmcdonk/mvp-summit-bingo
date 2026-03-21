import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SignInButton from '@/components/SignInButton';
import Link from 'next/link';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect('/play');
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="text-center px-6 py-12 rounded-3xl bg-white/10 backdrop-blur-md shadow-2xl max-w-md w-full mx-4">
        <div className="text-6xl mb-4">🎯</div>
        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">MVP Summit Bingo</h1>
        <p className="text-blue-200 mb-8 text-lg">Sign in with your Microsoft account to play!</p>
        <SignInButton />
        <div className="mt-4">

        </div>
      </div>
    </main>
  );
}
