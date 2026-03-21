'use client';

import { useEffect, useState } from 'react';
import { CardWithProgress } from '@/types';
import BingoCell from './BingoCell';
import WinnerBanner from './WinnerBanner';

export default function BingoBoard() {
  const [data, setData] = useState<CardWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/card')
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load card.');
        setLoading(false);
      });
  }, []);

  const handleToggle = async (index: number, currentlyMarked: boolean) => {
    if (!data) return;
    const newMarked = !currentlyMarked;
    const res = await fetch('/api/card/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index, marked: newMarked }),
    });
    const updatedProgress = await res.json();
    if (!updatedProgress.error) {
      setData((prev) => prev ? { ...prev, progress: updatedProgress } : prev);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-400 text-lg">Loading your bingo card...</div>;
  }
  if (error) {
    return <div className="text-center py-20 text-red-400 text-lg">{error}</div>;
  }
  if (!data) return null;

  const { card, progress, phrases } = data;
  const markedSet = new Set(progress.markedIndexes);

  return (
    <div>
      {progress.hasBingo && <WinnerBanner type="bingo" />}
      {!progress.hasBingo && progress.hasHouse && <WinnerBanner type="house" />}
      <div
        className="grid grid-cols-5 gap-2"
        role="grid"
        aria-label="Bingo card"
      >
        {card.phrases.map((phraseId, index) => {
          const phrase = phrases.find((p) => p.id === phraseId);
          return (
            <BingoCell
              key={phraseId}
              index={index}
              text={phrase?.text ?? 'Unknown'}
              marked={markedSet.has(index)}
              onToggle={handleToggle}
            />
          );
        })}
      </div>
      <div className="mt-4 text-center text-gray-400 text-sm">
        {progress.markedIndexes.length} / 25 marked &bull; {progress.linesCompleted} line{progress.linesCompleted !== 1 ? 's' : ''} completed
      </div>
    </div>
  );
}
