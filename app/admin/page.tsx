'use client';

import { useSession, signOut } from 'next-auth/react';
import { Fragment, useEffect, useState, useMemo } from 'react';
import { MAX_GUESS_LENGTH } from '@/lib/conferenceGuess';
import { RESET_CONFIRMATION } from '@/lib/admin';
import { redirect } from 'next/navigation';
import { UserStatusSummary, Phrase, AdminConferenceGuess } from '@/lib/types';

type SortField = 'displayName' | 'markedCount' | 'linesCompleted' | 'hasHouse' | 'hasBingo' | 'lastActivity';
type SortDirection = 'asc' | 'desc';

function SortIndicator({ field, sortField, sortDirection }: { field: SortField; sortField: SortField; sortDirection: SortDirection }) {
  if (sortField !== field) return <span className="ml-1 text-gray-300">↕</span>;
  return <span className="ml-1">{sortDirection === 'asc' ? '▲' : '▼'}</span>;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<UserStatusSummary[]>([]);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [phraseCounts, setPhraseCounts] = useState<Record<string, number>>({});
  const [newPhraseText, setNewPhraseText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('markedCount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [conferenceGuesses, setConferenceGuesses] = useState<AdminConferenceGuess[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [answerInput, setAnswerInput] = useState('');
  const [guessMessage, setGuessMessage] = useState<string | null>(null);
  const [expandedGuess, setExpandedGuess] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const user = session?.user as { roles?: string[] } | undefined;
  const isAdmin = user?.roles?.includes('admin');

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      let aVal: string | number | boolean = a[sortField];
      let bVal: string | number | boolean = b[sortField];

      if (typeof aVal === 'boolean') {
        aVal = aVal ? 1 : 0;
        bVal = (bVal as boolean) ? 1 : 0;
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

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
        fetch('/api/admin/phrase-counts').then((r) => r.json()),
        fetch('/api/admin/conference-guesses').then((r) => r.json()),
      ]).then(([statusData, phraseData, countsData, guessData]) => {
        setUsers(statusData.users ?? []);
        setPhrases(phraseData.phrases ?? []);
        setPhraseCounts(countsData.phraseCounts ?? {});
        setConferenceGuesses(guessData.guesses ?? []);
        setCorrectAnswer(guessData.correctAnswer ?? null);
        setAnswerInput(guessData.correctAnswer ?? '');
        setLoading(false);
      });
    }
  }, [status, isAdmin]);


  const saveCorrectAnswer = async (answer: string | null) => {
    setGuessMessage(null);
    const res = await fetch('/api/admin/conference-guesses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correctAnswer: answer }),
    });
    const json = await res.json();
    if (!res.ok) {
      setGuessMessage(json.error ?? 'Failed to save');
      return;
    }
    // Reload so isCorrect flags are recomputed server-side with the same matching rules.
    const refreshed = await fetch('/api/admin/conference-guesses').then((r) => r.json());
    setConferenceGuesses(refreshed.guesses ?? []);
    setCorrectAnswer(refreshed.correctAnswer ?? null);
    setAnswerInput(refreshed.correctAnswer ?? '');
    setGuessMessage(answer ? 'Correct answer saved — guessing is now closed.' : 'Answer cleared — guessing reopened.');
  };

  const handleDeleteGuess = async (g: AdminConferenceGuess) => {
    if (!window.confirm(`Delete ${g.displayName}'s guess "${g.location}" and its history? They will be able to guess again.`)) return;
    setGuessMessage(null);
    const res = await fetch(`/api/admin/conference-guesses?userId=${encodeURIComponent(g.userId)}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) {
      const json = await res.json().catch(() => ({}));
      setGuessMessage(json.error ?? 'Failed to delete guess');
      return;
    }
    setConferenceGuesses((prev) => prev.filter((x) => x.userId !== g.userId));
    if (expandedGuess === g.userId) setExpandedGuess(null);
    setGuessMessage(`Deleted ${g.displayName}'s guess.`);
  };

  const handleDeleteAllGuesses = async () => {
    if (!window.confirm(`Delete ALL ${conferenceGuesses.length} ESPC guesses and their history? This cannot be undone.`)) return;
    setGuessMessage(null);
    const res = await fetch('/api/admin/conference-guesses?all=true', { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setGuessMessage(json.error ?? 'Failed to delete guesses');
      return;
    }
    setConferenceGuesses([]);
    setExpandedGuess(null);
    setGuessMessage(`Deleted ${json.deleted} guess${json.deleted !== 1 ? 'es' : ''}.`);
  };

  const handleResetUsers = async () => {
    if (resetConfirm !== RESET_CONFIRMATION || resetting) return;
    setResetting(true);
    setResetMessage(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: resetConfirm }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Reset failed');
      const { users: u, cards, progress } = json.deleted;
      setUsers([]);
      setPhraseCounts({});
      setResetOpen(false);
      setResetConfirm('');
      setResetMessage(`Deleted ${u} user${u !== 1 ? 's' : ''}, ${cards} card${cards !== 1 ? 's' : ''} and ${progress} progress record${progress !== 1 ? 's' : ''}.`);
    } catch (err) {
      setResetMessage(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setResetting(false);
    }
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
            <a href="/about" className="text-sm text-blue-600 hover:underline">About</a>
            <button onClick={() => signOut({ callbackUrl: '/' })} className="text-sm text-gray-600">Sign Out</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* User Status Table */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-xl font-bold">User Progress</h2>
            {!resetOpen && (
              <button
                type="button"
                onClick={() => { setResetOpen(true); setResetMessage(null); }}
                className="px-3 py-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 font-medium"
              >
                🗑️ Clear all users &amp; cards
              </button>
            )}
          </div>
          {resetOpen && (
            <div role="alertdialog" aria-labelledby="reset-title" className="mb-4 rounded-xl border-2 border-red-300 bg-red-50 p-4 space-y-3">
              <h3 id="reset-title" className="font-bold text-red-800">Clear all users and cards?</h3>
              <p className="text-sm text-red-800">
                This permanently deletes every user profile, bingo card and marked square ({users.length} user{users.length !== 1 ? 's' : ''}).
                Phrases and ESPC guesses are kept. Users get a fresh random card next time they open the game.
              </p>
              <label className="block text-sm text-red-900">
                Type <code className="font-mono font-bold">{RESET_CONFIRMATION}</code> to confirm:
                <input
                  type="text"
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  autoComplete="off"
                  className="mt-1 block w-full sm:w-80 px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResetUsers}
                  disabled={resetConfirm !== RESET_CONFIRMATION || resetting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50"
                >
                  {resetting ? 'Deleting…' : 'Delete everything'}
                </button>
                <button
                  type="button"
                  onClick={() => { setResetOpen(false); setResetConfirm(''); }}
                  disabled={resetting}
                  className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {resetMessage && <p role="status" className="mb-4 text-sm font-medium text-gray-700">{resetMessage}</p>}
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">
                    <button onClick={() => handleSort('displayName')} aria-label={`Sort by user name${sortField === 'displayName' ? `, currently sorted ${sortDirection}ending` : ''}`} className="flex items-center hover:text-blue-600">
                      User<SortIndicator field="displayName" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">
                    <button onClick={() => handleSort('markedCount')} aria-label={`Sort by marked count${sortField === 'markedCount' ? `, currently sorted ${sortDirection}ending` : ''}`} className="flex items-center justify-center w-full hover:text-blue-600">
                      Marked<SortIndicator field="markedCount" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">
                    <button onClick={() => handleSort('linesCompleted')} aria-label={`Sort by lines completed${sortField === 'linesCompleted' ? `, currently sorted ${sortDirection}ending` : ''}`} className="flex items-center justify-center w-full hover:text-blue-600">
                      Lines<SortIndicator field="linesCompleted" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">
                    <button onClick={() => handleSort('hasHouse')} aria-label={`Sort by house${sortField === 'hasHouse' ? `, currently sorted ${sortDirection}ending` : ''}`} className="flex items-center justify-center w-full hover:text-blue-600">
                      House<SortIndicator field="hasHouse" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">
                    <button onClick={() => handleSort('hasBingo')} aria-label={`Sort by bingo${sortField === 'hasBingo' ? `, currently sorted ${sortDirection}ending` : ''}`} className="flex items-center justify-center w-full hover:text-blue-600">
                      Bingo<SortIndicator field="hasBingo" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    <button onClick={() => handleSort('lastActivity')} aria-label={`Sort by last activity${sortField === 'lastActivity' ? `, currently sorted ${sortDirection}ending` : ''}`} className="flex items-center hover:text-blue-600">
                      Last Activity<SortIndicator field="lastActivity" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((u) => (
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

        {/* ESPC Location Guesses */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-xl font-bold">ESPC Location Guesses ({conferenceGuesses.length})</h2>
            {conferenceGuesses.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAllGuesses}
                className="px-3 py-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 font-medium"
              >
                🗑️ Delete all guesses
              </button>
            )}
          </div>
          <div className="bg-white rounded-xl shadow p-4 space-y-3 mb-4">
            <p className="text-sm text-gray-600">
              Correct answer: <strong>{correctAnswer ?? 'Not set (guessing open)'}</strong>
            </p>
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => { e.preventDefault(); if (answerInput.trim()) saveCorrectAnswer(answerInput); }}
            >
              <label className="flex flex-col text-sm flex-1 min-w-48">
                <span className="font-medium mb-1">Set correct location</span>
                <input
                  type="text"
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  maxLength={MAX_GUESS_LENGTH}
                  placeholder="e.g. Dublin"
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </label>
              <button
                type="submit"
                disabled={!answerInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                Set answer
              </button>
              {correctAnswer && (
                <button
                  type="button"
                  onClick={() => saveCorrectAnswer(null)}
                  className="px-4 py-2 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100"
                >
                  Clear
                </button>
              )}
            </form>
            <p className="text-xs text-gray-500">Matching ignores case, accents and punctuation. Setting an answer locks all guesses.</p>
            {guessMessage && <p role="status" className="text-sm text-gray-700">{guessMessage}</p>}
          </div>

          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">User</th>
                  <th className="px-4 py-3 text-left font-semibold">Current guess</th>
                  <th className="px-4 py-3 text-center font-semibold">Submissions</th>
                  <th className="px-4 py-3 text-left font-semibold">First / last submitted</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {conferenceGuesses.map((g) => {
                  const changes = g.history.length;
                  const expanded = expandedGuess === g.userId;
                  return (
                    <Fragment key={g.userId}>
                      <tr className={`border-b ${g.isCorrect ? 'bg-yellow-100 font-semibold' : 'hover:bg-gray-50'}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{g.isCorrect && '🏆 '}{g.displayName}</div>
                          <div className="text-gray-500 text-xs">{g.email}</div>
                        </td>
                        <td className="px-4 py-3">{g.location}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => setExpandedGuess(expanded ? null : g.userId)}
                            aria-expanded={expanded}
                            className={`px-2 py-1 rounded-full text-xs font-medium ${changes > 1 ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'}`}
                          >
                            {changes} {expanded ? '▲' : '▼'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(g.createdAt).toLocaleString()}<br />{new Date(g.updatedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteGuess(g)}
                            aria-label={`Delete guess by ${g.displayName}`}
                            className="px-3 py-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="border-b bg-gray-50">
                          <td colSpan={5} className="px-6 py-3">
                            <ol className="space-y-1 text-xs">
                              {g.history.map((h, i) => (
                                <li key={i} className="flex gap-4">
                                  <span className="text-gray-500 w-44 shrink-0">{new Date(h.submittedAt).toLocaleString()}</span>
                                  <span>{h.location}</span>
                                </li>
                              ))}
                            </ol>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {conferenceGuesses.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No guesses yet</td></tr>
                )}
              </tbody>
            </table>
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
                  <th className="px-4 py-3 text-center font-semibold">Ticks</th>
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
                    <td className="px-4 py-3 text-center font-medium">{phraseCounts[phrase.id] ?? 0}</td>
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
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No phrases yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
