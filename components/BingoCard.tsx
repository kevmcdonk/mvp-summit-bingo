'use client';

import { Phrase, BingoProgress } from '@/lib/types';
import BingoCell from './BingoCell';
import { detectLines } from '@/lib/bingo';

interface BingoCardProps {
  phrases: Phrase[];
  cardPhraseIds: string[];
  progress: BingoProgress;
  onToggle: (index: number, marked: boolean) => void;
}

export default function BingoCard({ phrases, cardPhraseIds, progress, onToggle }: BingoCardProps) {
  const phraseMap = new Map(phrases.map((p) => [p.id, p]));
  const markedSet = new Set(progress.markedIndexes);
  const completedLines = detectLines(progress.markedIndexes);
  const winningCells = new Set(completedLines.flat());

  return (
    <div
      role="grid"
      aria-label="Bingo card"
      className="grid grid-cols-5 gap-1 sm:gap-2 w-full max-w-2xl mx-auto"
    >
      {cardPhraseIds.map((phraseId, index) => {
        const phrase = phraseMap.get(phraseId);
        if (!phrase) return null;
        return (
          <div key={index} role="gridcell">
            <BingoCell
              phrase={phrase}
              index={index}
              marked={markedSet.has(index)}
              isWinningCell={winningCells.has(index)}
              onToggle={onToggle}
            />
          </div>
        );
      })}
    </div>
  );
}
