import { detectLines, detectHouse, detectBingo, generateCard, WINNING_LINES } from '@/lib/bingo';

describe('detectLines', () => {
  it('returns 0 for empty board', () => {
    expect(detectLines([])).toBe(0);
  });

  it('detects a horizontal line', () => {
    expect(detectLines([0, 1, 2, 3, 4])).toBe(1);
  });

  it('detects a vertical line', () => {
    expect(detectLines([0, 5, 10, 15, 20])).toBe(1);
  });

  it('detects a diagonal line', () => {
    expect(detectLines([0, 6, 12, 18, 24])).toBe(1);
  });

  it('detects multiple lines', () => {
    // First row + first column
    const marked = [0, 1, 2, 3, 4, 5, 10, 15, 20];
    expect(detectLines(marked)).toBe(2);
  });

  it('returns 12 for a full board', () => {
    const all = Array.from({ length: 25 }, (_, i) => i);
    expect(detectLines(all)).toBe(12);
  });
});

describe('detectHouse', () => {
  it('returns false for empty board', () => {
    expect(detectHouse([])).toBe(false);
  });

  it('returns true when at least one line is complete', () => {
    expect(detectHouse([0, 1, 2, 3, 4])).toBe(true);
  });
});

describe('detectBingo', () => {
  it('returns false for partial board', () => {
    expect(detectBingo([0, 1, 2])).toBe(false);
  });

  it('returns true for full board (25 marks)', () => {
    const all = Array.from({ length: 25 }, (_, i) => i);
    expect(detectBingo(all)).toBe(true);
  });

  it('returns false for 24 marks', () => {
    const almost = Array.from({ length: 24 }, (_, i) => i);
    expect(detectBingo(almost)).toBe(false);
  });
});

describe('generateCard', () => {
  it('returns exactly 25 phrase ids', () => {
    const pool = Array.from({ length: 30 }, (_, i) => `phrase-${i}`);
    const card = generateCard(pool);
    expect(card).toHaveLength(25);
  });

  it('throws when fewer than 25 phrases available', () => {
    const pool = Array.from({ length: 24 }, (_, i) => `phrase-${i}`);
    expect(() => generateCard(pool)).toThrow();
  });

  it('returns unique phrases', () => {
    const pool = Array.from({ length: 30 }, (_, i) => `phrase-${i}`);
    const card = generateCard(pool);
    expect(new Set(card).size).toBe(25);
  });

  it('only uses ids from the pool', () => {
    const pool = Array.from({ length: 30 }, (_, i) => `phrase-${i}`);
    const poolSet = new Set(pool);
    const card = generateCard(pool);
    card.forEach((id) => expect(poolSet.has(id)).toBe(true));
  });
});

describe('WINNING_LINES', () => {
  it('has 12 winning lines', () => {
    expect(WINNING_LINES).toHaveLength(12);
  });
});
