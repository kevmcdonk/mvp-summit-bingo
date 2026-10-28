import {
  buildGuessInstant,
  findClosestGuesses,
  getWindowDays,
  isValidDateKey,
  isWithinWindow,
  parseInstant,
} from '../lib/guess';

describe('getWindowDays', () => {
  it('returns 14 consecutive UTC days by default', () => {
    const days = getWindowDays('2026-10-28');
    expect(days).toHaveLength(14);
    expect(days[0]).toBe('2026-10-28');
    expect(days[4]).toBe('2026-11-01');
    expect(days[13]).toBe('2026-11-10');
  });
});

describe('isWithinWindow', () => {
  it('accepts the first and last instants of the window', () => {
    expect(isWithinWindow(new Date('2026-10-28T00:00:00Z'), '2026-10-28')).toBe(true);
    expect(isWithinWindow(new Date('2026-11-10T23:00:00Z'), '2026-10-28')).toBe(true);
  });

  it('rejects instants outside the window', () => {
    expect(isWithinWindow(new Date('2026-10-27T23:59:59Z'), '2026-10-28')).toBe(false);
    expect(isWithinWindow(new Date('2026-11-11T00:00:00Z'), '2026-10-28')).toBe(false);
  });
});

describe('isValidDateKey', () => {
  it('validates YYYY-MM-DD dates', () => {
    expect(isValidDateKey('2026-10-28')).toBe(true);
    expect(isValidDateKey('2026-02-30')).toBe(false);
    expect(isValidDateKey('28/10/2026')).toBe(false);
    expect(isValidDateKey(null)).toBe(false);
  });
});

describe('parseInstant', () => {
  it('parses valid ISO strings and rejects invalid input', () => {
    expect(parseInstant('2026-10-28T10:00:00.000Z')?.toISOString()).toBe('2026-10-28T10:00:00.000Z');
    expect(parseInstant('nope')).toBeNull();
    expect(parseInstant(42)).toBeNull();
  });
});

describe('buildGuessInstant', () => {
  it('builds a UTC instant at the given hour', () => {
    expect(buildGuessInstant('2026-10-28', 9)).toBe('2026-10-28T09:00:00.000Z');
  });
});

describe('findClosestGuesses', () => {
  const guesses = [
    { name: 'a', guessAt: '2026-10-29T10:00:00.000Z' },
    { name: 'b', guessAt: '2026-10-30T08:00:00.000Z' },
    { name: 'c', guessAt: '2026-10-30T12:00:00.000Z' },
  ];

  it('returns nothing when correct time is not set', () => {
    expect(findClosestGuesses(guesses, null)).toEqual([]);
  });

  it('returns the closest guess', () => {
    expect(findClosestGuesses(guesses, '2026-10-29T11:00:00.000Z').map((g) => g.name)).toEqual(['a']);
  });

  it('returns all tied guesses', () => {
    expect(findClosestGuesses(guesses, '2026-10-30T10:00:00.000Z').map((g) => g.name)).toEqual(['b', 'c']);
  });
});
