export const CONFERENCE_GUESS_SETTINGS_ID = 'espc-conference-guess';
export const MAX_GUESS_LENGTH = 100;

/** Trims and collapses whitespace. Returns null when empty or too long. */
export function sanitizeLocation(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned || cleaned.length > MAX_GUESS_LENGTH) return null;
  return cleaned;
}

/** Lowercase, accent-insensitive, punctuation-insensitive key used to compare guesses. */
export function normalizeLocation(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function isCorrectGuess(location: string, correctAnswer: string | null): boolean {
  if (!correctAnswer) return false;
  const answer = normalizeLocation(correctAnswer);
  return answer.length > 0 && normalizeLocation(location) === answer;
}
