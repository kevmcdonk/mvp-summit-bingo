'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { redirect } from 'next/navigation';
import { PublicGuess } from '@/lib/types';
import { buildGuessInstant, findClosestGuesses, getWindowDays, toDateKey } from '@/lib/guess';

interface GuessData {
  windowStart: string;
  correctAt: string | null;
  guesses: PublicGuess[];
  myGuess: PublicGuess | null;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, h) => h);

function formatUtc(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }) + ' UTC';
}

function formatLocal(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
}

function dayLabel(dateKey: string) {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' }),
    day: d.getUTCDate(),
    month: d.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' }),
    long: d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }),
  };
}

export default function GuessPage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<GuessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') redirect('/');
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/guesses')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((json: GuessData) => {
        setData(json);
        const initial = json.correctAt ?? json.myGuess?.guessAt;
        setSelectedDay(initial ? toDateKey(new Date(initial)) : null);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load guesses. Please try again.');
        setLoading(false);
      });
  }, [status]);

  const days = useMemo(() => (data ? getWindowDays(data.windowStart) : []), [data]);

  const guessesByDay = useMemo(() => {
    const map = new Map<string, PublicGuess[]>();
    for (const g of data?.guesses ?? []) {
      const key = toDateKey(new Date(g.guessAt));
      map.set(key, [...(map.get(key) ?? []), g]);
    }
    return map;
  }, [data]);

  const closest = useMemo(
    () => new Set(findClosestGuesses(data?.guesses ?? [], data?.correctAt ?? null)),
    [data],
  );

  const correctDay = data?.correctAt ? toDateKey(new Date(data.correctAt)) : null;
  const correctHour = data?.correctAt ? new Date(data.correctAt).getUTCHours() : null;
  const myDay = data?.myGuess ? toDateKey(new Date(data.myGuess.guessAt)) : null;
  const canGuess = !!data && !data.myGuess && !data.correctAt;

  const handleSubmit = async () => {
    if (!selectedDay || selectedHour === null || !canGuess) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/guesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guessAt: buildGuessInstant(selectedDay, selectedHour) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to save guess');
      setData((prev) => prev && {
        ...prev,
        myGuess: json,
        guesses: [...prev.guesses, json].sort((a, b) => a.guessAt.localeCompare(b.guessAt)),
      });
      setSelectedHour(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save guess');
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
  // Pad the start so days line up under Mon..Sun headings.
  const leadingBlanks = (new Date(`${data.windowStart}T00:00:00.000Z`).getUTCDay() + 6) % 7;
  const selectedGuesses = selectedDay ? guessesByDay.get(selectedDay) ?? [] : [];

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">📅 Registration Guess</h1>
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
          When will MVP Summit registration open? Pick a day and hour (UTC) in the next two weeks.
          You only get <strong>one guess</strong> — choose wisely!
        </p>

        {data.correctAt && (
          <div role="status" className="rounded-xl bg-yellow-300 border-4 border-yellow-500 p-4 text-center animate-pulse">
            <p className="text-2xl font-black text-gray-900">🎟️ Registration opened {formatUtc(data.correctAt)}</p>
            <p className="text-sm text-gray-800">({formatLocal(data.correctAt)})</p>
            {closest.size > 0 && (
              <p className="mt-2 font-bold text-gray-900">
                🏆 Closest guess: {[...closest].map((g) => g.displayName).join(', ')}
              </p>
            )}
          </div>
        )}

        {data.myGuess && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
            <p className="font-semibold text-blue-900">Your guess: {formatUtc(data.myGuess.guessAt)}</p>
            <p className="text-sm text-blue-800">({formatLocal(data.myGuess.guessAt)})</p>
          </div>
        )}

        {error && <p role="alert" className="text-red-600 font-medium">{error}</p>}

        <section aria-label="Two-week calendar">
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-semibold text-gray-500 mb-1">
            {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {Array.from({ length: leadingBlanks }, (_, i) => <div key={`blank-${i}`} />)}
            {days.map((day) => {
              const label = dayLabel(day);
              const count = guessesByDay.get(day)?.length ?? 0;
              const isCorrect = day === correctDay;
              const isMine = day === myDay;
              const isSelected = day === selectedDay;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => { setSelectedDay(day); setSelectedHour(null); }}
                  aria-pressed={isSelected}
                  aria-label={`${label.long}: ${count} guess${count !== 1 ? 'es' : ''}${isCorrect ? ', registration day' : ''}${isMine ? ', your guess' : ''}`}
                  className={[
                    'relative rounded-lg p-1 sm:p-2 min-h-16 sm:min-h-20 flex flex-col items-center justify-center border-2 transition',
                    'focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400',
                    isCorrect
                      ? 'bg-yellow-300 border-yellow-500 animate-pulse'
                      : isSelected
                        ? 'bg-blue-100 border-blue-500'
                        : 'bg-white border-gray-200 hover:border-blue-300',
                  ].join(' ')}
                >
                  <span className="text-[10px] sm:text-xs text-gray-500">{label.month}</span>
                  <span className="text-lg sm:text-2xl font-bold text-gray-900">{label.day}</span>
                  {count > 0 && (
                    <span className="text-[10px] sm:text-xs font-semibold text-blue-700">{count} 🗳️</span>
                  )}
                  {isMine && <span className="absolute top-0.5 right-1 text-xs" aria-hidden="true">⭐</span>}
                  {isCorrect && <span className="absolute top-0.5 left-1 text-xs" aria-hidden="true">🎟️</span>}
                </button>
              );
            })}
          </div>
        </section>

        {selectedDay && (
          <section aria-label="Hours for selected day" className="bg-white rounded-xl shadow p-4 space-y-4">
            <h2 className="text-lg font-bold">{dayLabel(selectedDay).long} (UTC)</h2>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {HOURS.map((hour) => {
                const instant = buildGuessInstant(selectedDay, hour);
                const count = selectedGuesses.filter((g) => g.guessAt === instant).length;
                const isCorrect = selectedDay === correctDay && hour === correctHour;
                const isMine = data.myGuess?.guessAt === instant;
                const isSelected = selectedHour === hour;
                return (
                  <button
                    key={hour}
                    type="button"
                    disabled={!canGuess}
                    onClick={() => setSelectedHour(hour)}
                    aria-pressed={isSelected}
                    aria-label={`${String(hour).padStart(2, '0')}:00 UTC: ${count} guess${count !== 1 ? 'es' : ''}${isCorrect ? ', registration time' : ''}${isMine ? ', your guess' : ''}`}
                    className={[
                      'rounded-md py-2 text-sm font-medium border-2 transition',
                      'focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400',
                      isCorrect
                        ? 'bg-yellow-300 border-yellow-500 animate-pulse'
                        : isMine
                          ? 'bg-blue-600 border-blue-700 text-white'
                          : isSelected
                            ? 'bg-blue-100 border-blue-500'
                            : 'bg-gray-50 border-gray-200 enabled:hover:border-blue-300',
                      !canGuess && !isCorrect && !isMine ? 'opacity-70 cursor-default' : '',
                    ].join(' ')}
                  >
                    {String(hour).padStart(2, '0')}:00
                    {count > 0 && <span className="block text-[10px]">{count} 🗳️</span>}
                  </button>
                );
              })}
            </div>

            {canGuess && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <p className="text-sm text-gray-600 flex-1">
                  {selectedHour === null
                    ? 'Select an hour to make your guess.'
                    : `Your local time: ${formatLocal(buildGuessInstant(selectedDay, selectedHour))}`}
                </p>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={selectedHour === null || submitting}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : 'Lock in my guess'}
                </button>
              </div>
            )}

            {selectedGuesses.length > 0 && (
              <ul className="divide-y divide-gray-100 border-t pt-2">
                {selectedGuesses.map((g, i) => (
                  <li
                    key={`${g.guessAt}-${i}`}
                    className={`py-2 flex justify-between text-sm ${closest.has(g) ? 'bg-yellow-100 font-bold px-2 rounded' : ''}`}
                  >
                    <span>{closest.has(g) && '🏆 '}{g.displayName}{g.isMine && ' (you)'}</span>
                    <span className="text-gray-600">{formatUtc(g.guessAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <p className="text-sm text-gray-500">{data.guesses.length} total guess{data.guesses.length !== 1 ? 'es' : ''} so far.</p>
      </div>
    </main>
  );
}
