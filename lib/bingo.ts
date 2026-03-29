import { Phrase, BingoProgress } from './types';
import { logError } from './logger';

export const WINNING_LINES: number[][] = [
  // Horizontal
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  // Vertical
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  // Diagonal
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
];

export function detectLines(markedIndexes: number[]): number[][] {
  const markedSet = new Set(markedIndexes);
  return WINNING_LINES.filter((line) => line.every((idx) => markedSet.has(idx)));
}

export function checkHouse(markedIndexes: number[]): boolean {
  return detectLines(markedIndexes).length > 0;
}

export function checkBingo(markedIndexes: number[]): boolean {
  return markedIndexes.length === 25;
}

export function generateCard(phrases: Phrase[], isInPerson?: boolean): string[] {
  const active = phrases.filter((p) => p.isActive && (!p.inPersonOnly || isInPerson === true));
  if (active.length < 25) {
    const error = new Error(
      `Not enough active phrases to generate a card. Need 25, got ${active.length}.`
    );
    logError('Card generation failed due to insufficient active phrases', error, {
      activeCount: active.length,
      totalCount: phrases.length,
    });
    throw error;
  }
  const shuffled = [...active];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 25).map((p) => p.id);
}

export function getLeaderboardRank(
  userId: string,
  allProgress: BingoProgress[],
): { rank: number; total: number } {
  const sorted = [...allProgress].sort((a, b) => {
    if (a.hasBingo !== b.hasBingo) return a.hasBingo ? -1 : 1;
    if (a.linesCompleted !== b.linesCompleted) return b.linesCompleted - a.linesCompleted;
    return b.markedIndexes.length - a.markedIndexes.length;
  });
  const index = sorted.findIndex((p) => p.userId === userId);
  // Users with no progress record are placed after all ranked players
  return { rank: index >= 0 ? index + 1 : sorted.length + 1, total: sorted.length };
}
