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
      <main className="min-h-screen flex items-center justify-center bg-espc-light" aria-busy="true">
        <div className="motion-safe:animate-spin w-12 h-12 border-4 border-espc-navy border-t-transparent rounded-full" aria-hidden="true" />
        <p className="sr-only" role="status">Loading guesses…</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-espc-light">
        <p role="alert" className="text-espc-red-dark text-xl font-semibold">{error}</p>
      </main>
    );
  }

  const user = session?.user as { roles?: string[] } | undefined;
  const isClosed = !!data.correctAnswer;
  const showForm = !isClosed && (!data.myGuess || editing);
  const winners = data.guesses.filter((g) => g.isCorrect);
  const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-espc-navy focus-visible:ring-offset-2';
  const navLink = 'rounded px-2 py-1 text-sm font-semibold text-white underline-offset-4 hover:underline hover:text-espc-cyan focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-espc-yellow';

  return (
    <div className="min-h-screen bg-espc-light text-espc-navy">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-espc-yellow focus:px-4 focus:py-2 focus:font-bold focus:text-espc-navy"
      >
        Skip to main content
      </a>
      <header className="bg-espc-navy sticky top-0 z-30 shadow">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-2xl font-black text-white tracking-tight">
            <span aria-hidden="true">🌍 </span>ESPC Location Guess
          </p>
          <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
            <a href="/play" className={navLink}>Play</a>
            <a href="/about" className={navLink}>About</a>
            {user?.roles?.includes('admin') && (
              <a href="/admin" className={navLink}>Admin</a>
            )}
            <button onClick={() => signOut({ callbackUrl: '/' })} className={navLink}>
              Sign Out
            </button>
          </nav>
        </div>
        <div className="h-1.5 bg-gradient-to-r from-espc-cyan via-espc-green to-espc-yellow" aria-hidden="true" />
      </header>

      <main id="main-content" tabIndex={-1} className="max-w-4xl mx-auto px-4 py-6 space-y-6 focus:outline-none">
        <div>
          <h1 className="text-3xl font-black text-espc-navy">Where will the next ESPC be?</h1>
          <p className="mt-2 text-espc-slate text-base">
            Guess the host city of the next <strong className="text-espc-navy">ESPC</strong> (European SharePoint,
            Microsoft 365 &amp; Azure Conference). You get <strong className="text-espc-navy">one guess</strong> — you
            can change it until the answer is revealed.
          </p>
        </div>

        {isClosed && (
          <section
            role="status"
            aria-labelledby="reveal-heading"
            className="rounded-xl bg-espc-yellow border-4 border-espc-navy p-5 text-center shadow-lg"
          >
            <h2 id="reveal-heading" className="text-2xl sm:text-3xl font-black text-espc-navy">
              <span aria-hidden="true">📍 </span>The next ESPC is in {data.correctAnswer}!
            </h2>
            <p className="mt-2 text-lg font-bold text-espc-navy">
              {winners.length > 0
                ? <><span aria-hidden="true">🏆 </span>Correct: {winners.map((g) => g.displayName).join(', ')}</>
                : 'Nobody guessed it this time!'}
            </p>
          </section>
        )}

        <div aria-live="assertive">
          {error && (
            <p role="alert" className="rounded-lg border-l-4 border-espc-red-dark bg-white px-4 py-3 font-semibold text-espc-red-dark">
              <span aria-hidden="true">⚠️ </span>{error}
            </p>
          )}
        </div>

        {showForm ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow border-t-4 border-espc-cyan p-5 space-y-3">
            <label htmlFor="location" className="block text-lg font-bold text-espc-navy">
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
                required
                aria-describedby="location-help"
                className={`flex-1 px-4 py-3 text-base text-espc-navy placeholder:text-espc-slate bg-white border-2 border-espc-slate rounded-lg ${focusRing}`}
              />
              <button
                type="submit"
                disabled={!location.trim() || submitting}
                className={`px-6 py-3 bg-espc-navy text-white rounded-lg font-bold hover:bg-espc-teal disabled:cursor-not-allowed disabled:bg-espc-slate ${focusRing}`}
              >
                {submitting ? 'Saving…' : data.myGuess ? 'Update guess' : 'Submit guess'}
              </button>
              {data.myGuess && (
                <button
                  type="button"
                  onClick={() => { setEditing(false); setLocation(data.myGuess!.location); }}
                  className={`px-5 py-3 bg-white border-2 border-espc-navy text-espc-navy rounded-lg font-semibold hover:bg-espc-light ${focusRing}`}
                >
                  Cancel
                </button>
              )}
            </div>
            <p id="location-help" className="text-sm text-espc-slate">
              City and/or country. {location.length}/{MAX_GUESS_LENGTH} characters.
            </p>
          </form>
        ) : data.myGuess && (
          <section
            aria-label="Your guess"
            className={`rounded-xl bg-white shadow border-l-8 p-5 flex flex-col sm:flex-row sm:items-center gap-3 ${data.myGuess.isCorrect ? 'border-espc-green-dark' : 'border-espc-cyan'}`}
          >
            <p className="flex-1 font-semibold text-espc-navy">
              Your guess: <span className="text-xl font-black">{data.myGuess.location}</span>
              {data.myGuess.isCorrect && <span className="ml-2 font-bold text-espc-green-dark"><span aria-hidden="true">🎉 </span>Correct!</span>}
            </p>
            {!isClosed && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className={`px-5 py-3 bg-white border-2 border-espc-navy text-espc-navy rounded-lg font-semibold hover:bg-espc-light ${focusRing}`}
              >
                Change guess
              </button>
            )}
          </section>
        )}

        <section aria-labelledby="all-guesses-heading" className="bg-white rounded-xl shadow overflow-x-auto">
          <h2 id="all-guesses-heading" className="text-xl font-bold text-espc-navy px-5 pt-5">
            All guesses ({data.guesses.length})
          </h2>
          <table className="w-full text-base mt-3" aria-labelledby="all-guesses-heading">
            <thead className="bg-espc-navy text-white">
              <tr>
                <th scope="col" className="px-5 py-3 text-left font-semibold">Name</th>
                <th scope="col" className="px-5 py-3 text-left font-semibold">Guess</th>
              </tr>
            </thead>
            <tbody>
              {data.guesses.map((g, i) => (
                <tr
                  key={`${g.displayName}-${i}`}
                  className={`border-b border-espc-border last:border-0 ${g.isCorrect ? 'bg-espc-yellow-light font-bold' : g.isMine ? 'bg-espc-light' : ''}`}
                >
                  <th scope="row" className={`px-5 py-3 text-left font-semibold ${g.isMine ? 'border-l-4 border-espc-cyan' : ''}`}>
                    {g.isCorrect && <span aria-hidden="true">🏆 </span>}
                    {g.displayName}
                    {g.isMine && <span className="font-bold text-espc-navy"> (you)</span>}
                    {g.isCorrect && <span className="ml-2 rounded bg-espc-navy px-2 py-0.5 text-xs font-bold uppercase text-white">Correct</span>}
                  </th>
                  <td className="px-5 py-3">{g.location}</td>
                </tr>
              ))}
              {data.guesses.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-5 py-6 text-center text-espc-slate">No guesses yet — be the first!</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
