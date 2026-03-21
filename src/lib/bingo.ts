import { BingoProgress } from '@/types';

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
  // Diagonals
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
];

export function detectLines(markedIndexes: number[]): number {
  const markedSet = new Set(markedIndexes);
  let linesCompleted = 0;
  for (const line of WINNING_LINES) {
    if (line.every((idx) => markedSet.has(idx))) {
      linesCompleted++;
    }
  }
  return linesCompleted;
}

export function detectHouse(markedIndexes: number[]): boolean {
  return detectLines(markedIndexes) > 0;
}

export function detectBingo(markedIndexes: number[]): boolean {
  return markedIndexes.length === 25;
}

export function computeProgress(
  _existing: Pick<BingoProgress, 'id' | 'userId' | 'cardId'>,
  markedIndexes: number[]
): Omit<BingoProgress, 'id' | 'userId' | 'cardId'> {
  const linesCompleted = detectLines(markedIndexes);
  const hasHouse = linesCompleted > 0;
  const hasBingo = detectBingo(markedIndexes);
  return {
    markedIndexes,
    linesCompleted,
    hasHouse,
    hasBingo,
    updatedAt: new Date().toISOString(),
  };
}

export function generateCard(phraseIds: string[]): string[] {
  if (phraseIds.length < 25) {
    throw new Error(`Need at least 25 active phrases, got ${phraseIds.length}`);
  }
  const shuffled = [...phraseIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 25);
}
