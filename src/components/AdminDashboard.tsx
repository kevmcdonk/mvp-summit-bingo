'use client';

import { useEffect, useState } from 'react';
import { AdminUserStatus } from '@/types';
import PhraseManager from './PhraseManager';

export default function AdminDashboard() {
  const [users, setUsers] = useState<AdminUserStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'phrases'>('users');

  useEffect(() => {
    fetch('/api/admin/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setUsers(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load user statuses.');
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('phrases')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'phrases' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
        >
          Phrases
        </button>
      </div>

      {activeTab === 'users' && (
        <div>
          {loading && <p className="text-gray-400">Loading...</p>}
          {error && <p className="text-red-400">{error}</p>}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400">
                    <th className="py-3 pr-4">User</th>
                    <th className="py-3 pr-4">Marked</th>
                    <th className="py-3 pr-4">Lines</th>
                    <th className="py-3 pr-4">House</th>
                    <th className="py-3 pr-4">Bingo</th>
                    <th className="py-3">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.userId} className="border-b border-gray-800 hover:bg-gray-900">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{user.displayName}</div>
                        <div className="text-gray-500 text-xs">{user.email}</div>
                      </td>
                      <td className="py-3 pr-4">{user.markedCount} / 25</td>
                      <td className="py-3 pr-4">{user.linesCompleted}</td>
                      <td className="py-3 pr-4">{user.hasHouse ? '✅' : '—'}</td>
                      <td className="py-3 pr-4">{user.hasBingo ? '🎉' : '—'}</td>
                      <td className="py-3 text-gray-400 text-xs">{new Date(user.updatedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && <p className="text-gray-500 py-4">No users yet.</p>}
            </div>
          )}
        </div>
      )}

      {activeTab === 'phrases' && <PhraseManager />}
    </div>
  );
}
