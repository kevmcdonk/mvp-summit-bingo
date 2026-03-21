'use client';

import { useEffect, useState } from 'react';
import { Phrase } from '@/types';

export default function PhraseManager() {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchPhrases = () => {
    setLoading(true);
    fetch('/api/admin/phrases')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setPhrases(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load phrases.');
        setLoading(false);
      });
  };

  useEffect(() => { fetchPhrases(); }, []);

  const handleAdd = async () => {
    if (!newText.trim()) return;
    setAdding(true);
    await fetch('/api/admin/phrases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newText.trim(), category: newCategory.trim() || null }),
    });
    setNewText('');
    setNewCategory('');
    setAdding(false);
    fetchPhrases();
  };

  const handleToggleActive = async (phrase: Phrase) => {
    await fetch(`/api/admin/phrases/${phrase.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !phrase.isActive }),
    });
    fetchPhrases();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this phrase?')) return;
    await fetch(`/api/admin/phrases/${id}`, { method: 'DELETE' });
    fetchPhrases();
  };

  return (
    <div>
      <div className="mb-6 flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="New phrase text..."
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="New phrase text"
        />
        <input
          type="text"
          placeholder="Category (optional)"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="w-40 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Phrase category"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newText.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {adding ? 'Adding...' : 'Add Phrase'}
        </button>
      </div>

      {loading && <p className="text-gray-400">Loading...</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && !error && (
        <div className="space-y-2">
          {phrases.map((phrase) => (
            <div key={phrase.id} className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3">
              <span className={`flex-1 ${phrase.isActive ? 'text-white' : 'text-gray-500 line-through'}`}>
                {phrase.text}
                {phrase.category && <span className="ml-2 text-xs text-gray-500">({phrase.category})</span>}
              </span>
              <button
                onClick={() => handleToggleActive(phrase)}
                className={`text-xs px-3 py-1 rounded-full font-medium ${phrase.isActive ? 'bg-green-800 text-green-200 hover:bg-green-700' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
              >
                {phrase.isActive ? 'Active' : 'Inactive'}
              </button>
              <button
                onClick={() => handleDelete(phrase.id)}
                className="text-xs px-3 py-1 rounded-full bg-red-900 text-red-300 hover:bg-red-800 font-medium"
              >
                Delete
              </button>
            </div>
          ))}
          {phrases.length === 0 && <p className="text-gray-500">No phrases yet.</p>}
        </div>
      )}
    </div>
  );
}
