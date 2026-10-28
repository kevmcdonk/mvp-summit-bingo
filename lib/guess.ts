export const GUESS_WINDOW_DAYS = 14;
export const GUESS_SETTINGS_ID = 'registration-guess';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isValidDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** YYYY-MM-DD for the UTC day of the given instant. */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The UTC date keys shown on the calendar, starting at windowStart. */
export function getWindowDays(windowStart: string, days = GUESS_WINDOW_DAYS): string[] {
  const start = new Date(`${windowStart}T00:00:00.000Z`).getTime();
  return Array.from({ length: days }, (_, i) => toDateKey(new Date(start + i * DAY_MS)));
}

/** Parses an ISO instant; returns null if invalid. */
export function parseInstant(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isWithinWindow(instant: Date, windowStart: string, days = GUESS_WINDOW_DAYS): boolean {
  const start = new Date(`${windowStart}T00:00:00.000Z`).getTime();
  const t = instant.getTime();
  return t >= start && t < start + days * DAY_MS;
}

/** Builds an ISO UTC instant from a date key and an hour (0-23). */
export function buildGuessInstant(dateKey: string, hour: number): string {
  return `${dateKey}T${String(hour).padStart(2, '0')}:00:00.000Z`;
}

/**
 * Returns the guessAt values that are closest to the correct time.
 * Multiple values are returned when tied.
 */
export function findClosestGuesses<T extends { guessAt: string }>(guesses: T[], correctAt: string | null): T[] {
  const correct = parseInstant(correctAt);
  if (!correct || guesses.length === 0) return [];
  let best = Infinity;
  let winners: T[] = [];
  for (const g of guesses) {
    const t = parseInstant(g.guessAt);
    if (!t) continue;
    const diff = Math.abs(t.getTime() - correct.getTime());
    if (diff < best) {
      best = diff;
      winners = [g];
    } else if (diff === best) {
      winners.push(g);
    }
  }
  return winners;
}
