'use client';

import { useSession, signOut } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import { UserStatusSummary, Phrase, GuessSettings } from '@/lib/types';
import { buildGuessInstant, toDateKey } from '@/lib/guess';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<UserStatusSummary[]>([]);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [newPhraseText, setNewPhraseText] = useState('');
  const [loading, setLoading] = useState(true);
  const [guessSettings, setGuessSettings] = useState<GuessSettings | null>(null);
  const [correctDate, setCorrectDate] = useState('');
  const [correctHour, setCorrectHour] = useState(0);
  const [windowStart, setWindowStart] = useState('');
  const [guessMessage, setGuessMessage] = useState<string | null>(null);

  const user = session?.user as { roles?: string[] } | undefined;
  const isAdmin = user?.roles?.includes('admin');

  const applyGuessSettings = useCallback((settings: GuessSettings) => {
    setGuessSettings(settings);
    setWindowStart(settings.windowStart);
    if (settings.correctAt) {
      const d = new Date(settings.correctAt);
      setCorrectDate(toDateKey(d));
      setCorrectHour(d.getUTCHours());
    } else {
      setCorrectDate(settings.windowStart);
      setCorrectHour(0);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/');
    }
    if (status === 'authenticated' && !isAdmin) {
      redirect('/play');
    }
  }, [status, isAdmin]);

  useEffect(() => {
    if (status === 'authenticated' && isAdmin) {
      Promise.all([
        fetch('/api/admin/status').then((r) => r.json()),
        fetch('/api/admin/phrases').then((r) => r.json()),
        fetch('/api/admin/guess-settings').then((r) => r.json()),
      ]).then(([statusData, phraseData, settings]) => {
        setUsers(statusData.users ?? []);
        setPhrases(phraseData.phrases ?? []);
        applyGuessSettings(settings);
        setLoading(false);
      });
    }
  }, [status, isAdmin, applyGuessSettings]);


  const saveGuessSettings = async (body: Record<string, unknown>, message: string) => {
    setGuessMessage(null);
    const res = await fetch('/api/admin/guess-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      setGuessMessage(json.error ?? 'Failed to save');
      return;
    }
    applyGuessSettings(json);
    setGuessMessage(message);
  };

  const handleAddPhrase = async () => {
    if (!newPhraseText.trim()) return;
    const res = await fetch('/api/admin/phrases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newPhraseText.trim(), isActive: true, category: null }),
    });
    const phrase = await res.json();
    setPhrases((prev) => [...prev, phrase]);
    setNewPhraseText('');
  };

  const handleTogglePhrase = async (phrase: Phrase) => {
    const res = await fetch('/api/admin/phrases', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...phrase, isActive: !phrase.isActive }),
    });
    const updated = await res.json();
    setPhrases((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleDeletePhrase = async (id: string) => {
    await fetch(`/api/admin/phrases?id=${id}`, { method: 'DELETE' });
    setPhrases((prev) => prev.filter((p) => p.id !== id));
  };

  if (status === 'loading' || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-black">🔧 Admin Dashboard</h1>
          <div className="flex gap-3">
            <a href="/phrases" className="text-sm text-blue-600 hover:underline">Phrases</a>
            <a href="/guess" className="text-sm text-blue-600 hover:underline">Guess</a>
            <a href="/play" className="text-sm text-blue-600 hover:underline">Play</a>
            <button onClick={() => signOut({ callbackUrl: '/' })} className="text-sm text-gray-600">Sign Out</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* User Status Table */}
        <section>
          <h2 className="text-xl font-bold mb-4">User Progress</h2>
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">User</th>
                  <th className="px-4 py-3 text-center font-semibold">Marked</th>
                  <th className="px-4 py-3 text-center font-semibold">Lines</th>
                  <th className="px-4 py-3 text-center font-semibold">House</th>
                  <th className="px-4 py-3 text-center font-semibold">Bingo</th>
                  <th className="px-4 py-3 text-left font-semibold">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.userId} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.displayName}</div>
                      <div className="text-gray-500 text-xs">{u.email}</div>
                    </td>
                    <td className="px-4 py-3 text-center">{u.markedCount}/25</td>
                    <td className="px-4 py-3 text-center">{u.linesCompleted}</td>
                    <td className="px-4 py-3 text-center">{u.hasHouse ? '🏠' : '—'}</td>
                    <td className="px-4 py-3 text-center">{u.hasBingo ? '🎉' : '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(u.lastActivity).toLocaleString()}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No users yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Registration Guess */}
        <section>
          <h2 className="text-xl font-bold mb-4">Registration Guess</h2>
          <div className="bg-white rounded-xl shadow p-4 space-y-4">
            <p className="text-sm text-gray-600">
              Current registration time:{' '}
              <strong>
                {guessSettings?.correctAt
                  ? new Date(guessSettings.correctAt).toUTCString()
                  : 'Not set (guessing open)'}
              </strong>
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col text-sm">
                <span className="font-medium mb-1">Date (UTC)</span>
                <input
                  type="date"
                  value={correctDate}
                  onChange={(e) => setCorrectDate(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
              </label>
              <label className="flex flex-col text-sm">
                <span className="font-medium mb-1">Hour (UTC)</span>
                <select
                  value={correctHour}
                  onChange={(e) => setCorrectHour(Number(e.target.value))}
                  className="px-3 py-2 border rounded-lg"
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => correctDate && saveGuessSettings(
                  { correctAt: buildGuessInstant(correctDate, correctHour) },
                  'Registration time saved — guessing is now closed.',
                )}
                disabled={!correctDate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                Set correct time
              </button>
              {guessSettings?.correctAt && (
                <button
                  onClick={() => saveGuessSettings({ correctAt: null }, 'Registration time cleared — guessing reopened.')}
                  className="px-4 py-2 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-end gap-2 border-t pt-4">
              <label className="flex flex-col text-sm">
                <span className="font-medium mb-1">Calendar start (first of 14 days, UTC)</span>
                <input
                  type="date"
                  value={windowStart}
                  onChange={(e) => setWindowStart(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
              </label>
              <button
                onClick={() => windowStart && saveGuessSettings({ windowStart }, 'Calendar start updated.')}
                disabled={!windowStart}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
              >
                Update calendar
              </button>
            </div>
            {guessMessage && <p role="status" className="text-sm text-gray-700">{guessMessage}</p>}
          </div>
        </section>

        {/* Phrase Management */}
        <section>
          <h2 className="text-xl font-bold mb-4">Bingo Phrases ({phrases.filter(p => p.isActive).length} active)</h2>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newPhraseText}
              onChange={(e) => setNewPhraseText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddPhrase()}
              placeholder="Enter new phrase..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="New phrase text"
            />
            <button
              onClick={handleAddPhrase}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Add
            </button>
          </div>

          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Phrase</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {phrases.map((phrase) => (
                  <tr key={phrase.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{phrase.text}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${phrase.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                        {phrase.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right flex gap-2 justify-end">
                      <button
                        onClick={() => handleTogglePhrase(phrase)}
                        className="px-3 py-1 text-xs border rounded hover:bg-gray-50"
                      >
                        {phrase.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeletePhrase(phrase.id)}
                        className="px-3 py-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {phrases.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">No phrases yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
