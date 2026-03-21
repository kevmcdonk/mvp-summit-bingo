import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SignInButton from '@/components/SignInButton';

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    redirect('/play');
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-900 text-white p-8">
      <div className="text-center max-w-lg">
        <h1 className="text-5xl font-bold mb-4">🎱 MVP Summit Bingo</h1>
        <p className="text-xl mb-8 text-blue-200">
          Mark the phrases you hear throughout the summit. First to complete a line wins!
        </p>
        <SignInButton />
      </div>
    </main>
  );
}
