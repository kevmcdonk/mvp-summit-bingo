import { Phrase } from './types';

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

export function generateCard(phrases: Phrase[]): string[] {
  const active = phrases.filter((p) => p.isActive);
  if (active.length < 25) {
    throw new Error(
      `Not enough active phrases to generate a card. Need 25, got ${active.length}.`
    );
  }
  const shuffled = [...active];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 25).map((p) => p.id);
}
