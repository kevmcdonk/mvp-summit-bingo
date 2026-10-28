import { isCorrectGuess, MAX_GUESS_LENGTH, normalizeLocation, sanitizeLocation } from '../lib/conferenceGuess';

describe('sanitizeLocation', () => {
  it('trims and collapses whitespace', () => {
    expect(sanitizeLocation('  Dublin,   Ireland ')).toBe('Dublin, Ireland');
  });

  it('rejects empty, non-string and over-long values', () => {
    expect(sanitizeLocation('   ')).toBeNull();
    expect(sanitizeLocation(42)).toBeNull();
    expect(sanitizeLocation(undefined)).toBeNull();
    expect(sanitizeLocation('x'.repeat(MAX_GUESS_LENGTH + 1))).toBeNull();
    expect(sanitizeLocation('x'.repeat(MAX_GUESS_LENGTH))).not.toBeNull();
  });
});

describe('normalizeLocation', () => {
  it('ignores case, accents and punctuation', () => {
    expect(normalizeLocation('Málaga, Spain!')).toBe('malaga spain');
  });
});

describe('isCorrectGuess', () => {
  it('returns false when no correct answer is set', () => {
    expect(isCorrectGuess('Dublin', null)).toBe(false);
  });

  it('matches loosely on case, accents and punctuation', () => {
    expect(isCorrectGuess('  dublin ', 'Dublin')).toBe(true);
    expect(isCorrectGuess('Malaga', 'Málaga')).toBe(true);
    expect(isCorrectGuess('Dublin, Ireland', 'dublin ireland')).toBe(true);
  });

  it('does not match different locations', () => {
    expect(isCorrectGuess('Dublin', 'Amsterdam')).toBe(false);
    expect(isCorrectGuess('', '!!!')).toBe(false);
  });
});
