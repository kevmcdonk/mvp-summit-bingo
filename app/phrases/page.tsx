import Link from 'next/link';
import { getPhrases } from '@/lib/cosmos';

export default async function PhrasesPage() {
  const phrases = await getPhrases();
  const activePhrases = phrases.filter((phrase) => phrase.isActive);

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">📋 Public Phrase List</h1>
          <Link href="/" className="text-sm text-blue-600 hover:underline font-medium">
            Home
          </Link>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-600 mb-4">
          Showing {activePhrases.length} active phrase{activePhrases.length !== 1 ? 's' : ''}.
        </p>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {activePhrases.map((phrase) => (
              <li key={phrase.id} className="px-4 py-3 text-gray-800">
                {phrase.text}
              </li>
            ))}
            {activePhrases.length === 0 && (
              <li className="px-4 py-8 text-center text-gray-400">No active phrases yet.</li>
            )}
          </ul>
        </div>
      </section>
    </main>
  );
}