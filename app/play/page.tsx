'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { redirect } from 'next/navigation';
import BingoCard from '@/components/BingoCard';
import WinBanner from '@/components/WinBanner';
import { CardWithProgress, BingoProgress } from '@/lib/types';
import { detectLines, checkHouse, checkBingo } from '@/lib/bingo';

type CardResponse = (CardWithProgress & { needsPreference?: false }) | { needsPreference: true };

export default function PlayPage() {
  const { data: session, status } = useSession();
  const [cardData, setCardData] = useState<CardWithProgress | null>(null);
  const [progress, setProgress] = useState<BingoProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [houseBannerDismissed, setHouseBannerDismissed] = useState(false);
  const [bingoBannerDismissed, setBingoBannerDismissed] = useState(false);
  const [leaderboardPosition, setLeaderboardPosition] = useState<{ rank: number; total: number } | null>(null);
  const [needsPreference, setNeedsPreference] = useState(false);
  const [settingPreference, setSettingPreference] = useState(false);

  const applyProgressFromMarks = useCallback((base: BingoProgress, markedIndexes: number[]): BingoProgress => {
    const linesCompleted = detectLines(markedIndexes).length;
    return {
      ...base,
      markedIndexes,
      linesCompleted,
      hasHouse: checkHouse(markedIndexes),
      hasBingo: checkBingo(markedIndexes),
      updatedAt: new Date().toISOString(),
    };
  }, []);

  const loadCard = useCallback(() => {
    return Promise.all([
      fetch('/api/card').then((res) => res.json() as Promise<CardResponse>),
      fetch('/api/leaderboard/position').then((res) => res.json()),
    ]).then(([data, pos]) => {
      if ('needsPreference' in data && data.needsPreference) {
        setNeedsPreference(true);
      } else {
        const cardResponse = data as CardWithProgress;
        setCardData(cardResponse);
        setProgress(cardResponse.progress);
        setNeedsPreference(false);
      }
      setLeaderboardPosition(pos);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/');
    }
  }, [status]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadCard().catch(() => {
        setError('Failed to load card. Please try again.');
        setLoading(false);
      });
    }
  }, [status, loadCard]);

  useEffect(() => {
    if (!progress?.hasBingo) {
      setBingoBannerDismissed(false);
    }
  }, [progress?.hasBingo]);

  useEffect(() => {
    if (!progress?.hasHouse) {
      setHouseBannerDismissed(false);
    }
  }, [progress?.hasHouse]);

  const handleSelectAttendance = useCallback(async (isInPerson: boolean) => {
    setSettingPreference(true);
    try {
      const res = await fetch('/api/user/preference', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isInPerson }),
      });
      if (!res.ok) throw new Error('Failed to set preference');
      // Reload card now that preference is set
      await loadCard();
    } catch {
      setError('Failed to set attendance preference. Please try again.');
    } finally {
      setSettingPreference(false);
    }
  }, [loadCard]);

  const handleToggle = useCallback(async (index: number, phraseId: string, marked: boolean) => {
    if (toggling) return;
    setToggling(true);

    // Optimistic update
    setProgress((prev) => {
      if (!prev) return prev;
      let markedIndexes: number[];
      if (marked) {
        markedIndexes = prev.markedIndexes.includes(index) ? prev.markedIndexes : [...prev.markedIndexes, index];
      } else {
        markedIndexes = prev.markedIndexes.filter((i) => i !== index);
      }
      const phraseCounts = { ...(prev.phraseCounts ?? {}) };
      if (marked) {
        phraseCounts[phraseId] = (phraseCounts[phraseId] ?? 0) + 1;
      } else {
        delete phraseCounts[phraseId];
      }
      return { ...applyProgressFromMarks(prev, markedIndexes), phraseCounts };
    });

    try {
      const res = await fetch('/api/card/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index, phraseId, marked }),
      });
      if (!res.ok) throw new Error('Toggle failed');
      const updated: BingoProgress = await res.json();
      setProgress(updated);
    } catch {
      // Revert optimistic update on failure
      setProgress((prev) => {
        if (!prev) return prev;
        const markedIndexes = marked
          ? prev.markedIndexes.filter((i) => i !== index)
          : [...prev.markedIndexes, index];
        const phraseCounts = { ...(prev.phraseCounts ?? {}) };
        if (marked) {
          const current = phraseCounts[phraseId] ?? 0;
          if (current > 1) {
            phraseCounts[phraseId] = current - 1;
          } else {
            delete phraseCounts[phraseId];
          }
        } else {
          phraseCounts[phraseId] = 1;
        }
        return { ...applyProgressFromMarks(prev, markedIndexes), phraseCounts };
      });
    } finally {
      setToggling(false);
    }
  }, [toggling, applyProgressFromMarks]);

  if (status === 'loading' || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" aria-hidden="true" />
          <p className="text-gray-600 text-lg">Loading your bingo card...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-600">
          <p className="text-xl mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-500 text-white rounded-lg">
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (needsPreference) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-black text-gray-900 mb-2">🎯 MVP Summit Bingo</h1>
          <p className="text-gray-600 mb-6">How are you attending the summit?</p>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => handleSelectAttendance(true)}
              disabled={settingPreference}
              className="px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-lg disabled:opacity-50"
            >
              <span aria-hidden="true">🏢</span> In-Person
            </button>
            <button
              onClick={() => handleSelectAttendance(false)}
              disabled={settingPreference}
              className="px-6 py-4 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 font-semibold text-lg disabled:opacity-50"
            >
              <span aria-hidden="true">💻</span> Remote
            </button>
          </div>
          {settingPreference && (
            <p className="mt-4 text-sm text-gray-500">Setting up your card...</p>
          )}
        </div>
      </main>
    );
  }

  if (!cardData || !progress) return null;

  const user = session?.user as { name?: string; roles?: string[] } | undefined;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Banners */}
      <WinBanner type="bingo" visible={progress.hasBingo && !bingoBannerDismissed} onClose={() => setBingoBannerDismissed(true)} />
      {!progress.hasBingo && (
        <WinBanner
          type="house"
          visible={progress.hasHouse && !houseBannerDismissed}
          onClose={() => setHouseBannerDismissed(true)}
        />
      )}

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">🎯 MVP Summit Bingo</h1>
          <div className="flex items-center gap-3">
            <a href="/phrases" className="text-sm text-blue-600 hover:underline font-medium">Phrases</a>
            {user?.roles?.includes('admin') && (
              <a href="/admin" className="text-sm text-blue-600 hover:underline font-medium">Admin</a>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-2">
        <div className="flex gap-4 text-sm text-gray-600">
          <span>✅ {progress.markedIndexes.length}/25 marked</span>
          <span><span aria-hidden="true">🏆</span> {progress.linesCompleted} line{progress.linesCompleted !== 1 ? 's' : ''}</span>
          {progress.hasHouse && <span className="text-blue-600 font-bold" aria-label="House achieved"><span aria-hidden="true">🏠</span> HOUSE!</span>}
          {progress.hasBingo && <span className="text-purple-600 font-bold" aria-label="Bingo achieved"><span aria-hidden="true">🎉</span> BINGO!</span>}
          {leaderboardPosition && (
            <span aria-label={`Leaderboard position ${leaderboardPosition.rank} of ${leaderboardPosition.total}`}>
              <span aria-hidden="true">🏅</span> #{leaderboardPosition.rank} of {leaderboardPosition.total}
            </span>
          )}
        </div>
      </div>

      {/* Card */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <BingoCard
          phrases={cardData.phrases}
          cardPhraseIds={cardData.card.phrases}
          progress={progress}
          onToggle={handleToggle}
        />
      </div>
    </main>
  );
}
