import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllConferenceGuesses, getConferenceGuessSettings, saveConferenceGuess } from '@/lib/cosmos';
import { isCorrectGuess, MAX_GUESS_LENGTH, sanitizeLocation } from '@/lib/conferenceGuess';
import { ConferenceGuess, PublicConferenceGuess } from '@/lib/types';

type SessionUser = { id: string; email?: string | null; name?: string | null };

async function getUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  return user?.id ? user : null;
}

// History, email and user ids are never exposed to non-admins.
function toPublic(guess: ConferenceGuess, userId: string, correctAnswer: string | null): PublicConferenceGuess {
  return {
    displayName: guess.displayName,
    location: guess.location,
    updatedAt: guess.updatedAt,
    isMine: guess.userId === userId,
    isCorrect: isCorrectGuess(guess.location, correctAnswer),
  };
}

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [settings, guesses] = await Promise.all([getConferenceGuessSettings(), getAllConferenceGuesses()]);
  const publicGuesses = guesses
    .map((g) => toPublic(g, user.id, settings.correctAnswer))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return NextResponse.json({
    correctAnswer: settings.correctAnswer,
    guesses: publicGuesses,
    myGuess: publicGuesses.find((g) => g.isMine) ?? null,
  });
}

/** Creates or updates the current user's guess. Body: { location: string } */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const location = sanitizeLocation((body as Record<string, unknown> | null)?.location);
  if (!location) {
    return NextResponse.json(
      { error: `location is required (1-${MAX_GUESS_LENGTH} characters)` },
      { status: 400 },
    );
  }

  const settings = await getConferenceGuessSettings();
  if (settings.correctAnswer) {
    return NextResponse.json({ error: 'Guessing is closed — the answer has been revealed' }, { status: 409 });
  }

  const saved = await saveConferenceGuess(
    { userId: user.id, displayName: user.name || user.email || 'Anonymous MVP', email: user.email ?? '' },
    location,
  );
  return NextResponse.json(toPublic(saved, user.id, settings.correctAnswer));
}
