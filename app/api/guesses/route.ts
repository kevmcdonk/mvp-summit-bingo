import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createGuess, getAllGuesses, getGuessSettings, GuessAlreadyExistsError } from '@/lib/cosmos';
import { isWithinWindow, parseInstant } from '@/lib/guess';
import { PublicGuess, RegistrationGuess } from '@/lib/types';

type SessionUser = { id: string; email?: string | null; name?: string | null };

async function getUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  return user?.id ? user : null;
}

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [settings, guesses] = await Promise.all([getGuessSettings(), getAllGuesses()]);
  const publicGuesses: PublicGuess[] = guesses
    .map((g) => ({ displayName: g.displayName, guessAt: g.guessAt, isMine: g.userId === user.id }))
    .sort((a, b) => a.guessAt.localeCompare(b.guessAt));

  return NextResponse.json({
    windowStart: settings.windowStart,
    correctAt: settings.correctAt,
    guesses: publicGuesses,
    myGuess: publicGuesses.find((g) => g.isMine) ?? null,
  });
}

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

  const guessAt = parseInstant((body as Record<string, unknown> | null)?.guessAt);
  if (!guessAt) {
    return NextResponse.json({ error: 'guessAt (ISO date-time) is required' }, { status: 400 });
  }

  const settings = await getGuessSettings();
  if (settings.correctAt) {
    return NextResponse.json({ error: 'Guessing is closed — the registration time has been revealed' }, { status: 409 });
  }
  if (!isWithinWindow(guessAt, settings.windowStart)) {
    return NextResponse.json({ error: 'Guess must be within the two-week calendar window' }, { status: 400 });
  }

  const guess: RegistrationGuess = {
    id: user.id,
    userId: user.id,
    displayName: user.name || user.email || 'Anonymous MVP',
    guessAt: guessAt.toISOString(),
    createdAt: new Date().toISOString(),
  };

  try {
    const created = await createGuess(guess);
    const result: PublicGuess = { displayName: created.displayName, guessAt: created.guessAt, isMine: true };
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof GuessAlreadyExistsError) {
      return NextResponse.json({ error: 'You have already made your guess' }, { status: 409 });
    }
    throw error;
  }
}
