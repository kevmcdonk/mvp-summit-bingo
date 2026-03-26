'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState, useMemo } from 'react';
import { redirect } from 'next/navigation';
import { UserStatusSummary, Phrase } from '@/lib/types';

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
      ]).then(([statusData, phraseData, countsData]) => {
        setUsers(statusData.users ?? []);
        setPhrases(phraseData.phrases ?? []);
        setPhraseCounts(countsData.phraseCounts ?? {});
        setLoading(false);
      });
    }
  }, [status, isAdmin]);

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
