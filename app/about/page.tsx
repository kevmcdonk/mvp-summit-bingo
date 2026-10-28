import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About | ESPC Bingo',
  description: 'ESPC Bingo is just a bit of fun to make the event more interesting.',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">ℹ️ About ESPC Bingo</h1>
          <nav className="flex items-center gap-3">
            <Link href="/phrases" className="text-sm text-blue-600 hover:underline font-medium">Phrases</Link>
            <Link href="/play" className="text-sm text-blue-600 hover:underline font-medium">Play</Link>
          </nav>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <section className="bg-white rounded-xl shadow p-6 space-y-3">
          <h2 className="text-xl font-bold text-gray-900">🎉 Just a bit of fun</h2>
          <p className="text-gray-700">
            ESPC Bingo is a light-hearted game to make the event a little more interesting. Listen out for the
            familiar phrases in sessions, keynotes and hallway chats, and mark them off on your card as you hear them.
          </p>
          <p className="text-gray-700">
            Complete a line to shout <strong>HOUSE</strong>, and fill the whole card for <strong>BINGO</strong>!
          </p>
        </section>

        <section className="bg-white rounded-xl shadow p-6 space-y-3">
          <h2 className="text-xl font-bold text-gray-900">🔄 Things change every day</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li>Phrases will be added and removed each day to keep things fresh.</li>
            <li>Cards will be reset, so everyone gets a new random card and a fresh chance to win.</li>
          </ul>
        </section>

        <section className="bg-white rounded-xl shadow p-6 space-y-3">
          <h2 className="text-xl font-bold text-gray-900">🏆 What do I win?</h2>
          <p className="text-gray-700">
            There&apos;s no prize — just the glory of winning (and bragging rights for the rest of the conference).
          </p>
        </section>

        <div className="text-center">
          <Link
            href="/play"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400"
          >
            Let&apos;s play!
          </Link>
        </div>
      </article>
    </main>
  );
}
