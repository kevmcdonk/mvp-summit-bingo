'use client';

import { useSession, signOut } from 'next-auth/react';
import { FormEvent, useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import { PublicConferenceGuess } from '@/lib/types';
import { MAX_GUESS_LENGTH } from '@/lib/conferenceGuess';

interface GuessData {
  correctAnswer: string | null;
  guesses: PublicConferenceGuess[];
  myGuess: PublicConferenceGuess | null;
}

export default function GuessPage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<GuessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') redirect('/');
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/conference-guesses')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((json: GuessData) => {
        setData(json);
        setLocation(json.myGuess?.location ?? '');
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load guesses. Please try again.');
        setLoading(false);
      });
  }, [status]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!location.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/conference-guesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to save guess');
      const saved = json as PublicConferenceGuess;
      setData((prev) => prev && {
        ...prev,
        myGuess: saved,
        guesses: [...prev.guesses.filter((g) => !g.isMine), saved]
          .sort((a, b) => a.displayName.localeCompare(b.displayName)),
      });
      setLocation(saved.location);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save guess');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" aria-hidden="true" />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-600 text-xl">{error}</p>
      </main>
    );
  }

  const user = session?.user as { roles?: string[] } | undefined;
  const isClosed = !!data.correctAnswer;
  const showForm = !isClosed && (!data.myGuess || editing);
  const winners = data.guesses.filter((g) => g.isCorrect);

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">🌍 ESPC Location Guess</h1>
          <nav className="flex items-center gap-3">
            <a href="/play" className="text-sm text-blue-600 hover:underline font-medium">Play</a>
            {user?.roles?.includes('admin') && (
              <a href="/admin" className="text-sm text-blue-600 hover:underline font-medium">Admin</a>
            )}
            <button onClick={() => signOut({ callbackUrl: '/' })} className="text-sm text-gray-600 hover:text-gray-900 font-medium">
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <p className="text-gray-700">
          Where will the next <strong>ESPC</strong> (European SharePoint, Microsoft 365 &amp; Azure Conference) be held?
          You get <strong>one guess</strong> — you can change it until the answer is revealed.
        </p>

        {isClosed && (
          <div role="status" className="rounded-xl bg-yellow-300 border-4 border-yellow-500 p-4 text-center animate-pulse">
            <p className="text-2xl font-black text-gray-900">📍 The next ESPC is in {data.correctAnswer}!</p>
            <p className="mt-2 font-bold text-gray-900">
              {winners.length > 0
                ? `🏆 Correct: ${winners.map((g) => g.displayName).join(', ')}`
                : 'Nobody guessed it this time!'}
            </p>
          </div>
        )}

        {error && <p role="alert" className="text-red-600 font-medium">{error}</p>}

        {showForm ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-4 space-y-3">
            <label htmlFor="location" className="block font-semibold text-gray-900">
              {data.myGuess ? 'Update your guess' : 'Your guess'}
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={MAX_GUESS_LENGTH}
                placeholder="e.g. Dublin, Ireland"
                autoComplete="off"
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                type="submit"
                disabled={!location.trim() || submitting}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Saving…' : data.myGuess ? 'Update guess' : 'Submit guess'}
              </button>
              {data.myGuess && (
                <button
                  type="button"
                  onClick={() => { setEditing(false); setLocation(data.myGuess!.location); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        ) : data.myGuess && (
          <div className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${data.myGuess.isCorrect ? 'bg-green-50 border-green-300' : 'bg-blue-50 border-blue-200'}`}>
            <p className="flex-1 font-semibold text-blue-900">
              Your guess: <span className="text-lg">{data.myGuess.location}</span>
              {data.myGuess.isCorrect && ' 🎉'}
            </p>
            {!isClosed && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100 font-medium"
              >
                Change guess
              </button>
            )}
          </div>
        )}

        <section aria-label="All guesses" className="bg-white rounded-xl shadow overflow-x-auto">
          <h2 className="text-lg font-bold px-4 pt-4">All guesses ({data.guesses.length})</h2>
          <table className="w-full text-sm mt-2">
            <thead className="bg-gray-50 border-y">
              <tr>
                <th scope="col" className="px-4 py-2 text-left font-semibold">Name</th>
                <th scope="col" className="px-4 py-2 text-left font-semibold">Guess</th>
              </tr>
            </thead>
            <tbody>
              {data.guesses.map((g, i) => (
                <tr
                  key={`${g.displayName}-${i}`}
                  className={`border-b last:border-0 ${g.isCorrect ? 'bg-yellow-100 font-bold' : g.isMine ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-4 py-2">
                    {g.isCorrect && <span aria-label="Correct guess">🏆 </span>}
                    {g.displayName}
                    {g.isMine && <span className="text-blue-700"> (you)</span>}
                  </td>
                  <td className="px-4 py-2">{g.location}</td>
                </tr>
              ))}
              {data.guesses.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-gray-400">No guesses yet — be the first!</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
