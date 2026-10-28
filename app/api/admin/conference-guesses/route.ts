import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllConferenceGuesses, getConferenceGuessSettings, setConferenceCorrectAnswer } from '@/lib/cosmos';
import { isCorrectGuess, MAX_GUESS_LENGTH, sanitizeLocation } from '@/lib/conferenceGuess';

async function checkAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  const user = session.user as { roles?: string[] };
  return user.roles?.includes('admin') ?? false;
}

/** Admin view: every guess including full submission history. */
export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [settings, guesses] = await Promise.all([getConferenceGuessSettings(), getAllConferenceGuesses()]);
  return NextResponse.json({
    correctAnswer: settings.correctAnswer,
    guesses: guesses
      .map((g) => ({
        userId: g.userId,
        displayName: g.displayName,
        email: g.email,
        location: g.location,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
        history: g.history ?? [],
        isCorrect: isCorrectGuess(g.location, settings.correctAnswer),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName)),
  });
}

/** Body: { correctAnswer: string | null } — null clears the answer and reopens guessing. */
export async function PUT(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const raw = (body as Record<string, unknown> | null)?.correctAnswer;
  let correctAnswer: string | null = null;
  if (raw !== null) {
    correctAnswer = sanitizeLocation(raw);
    if (!correctAnswer) {
      return NextResponse.json(
        { error: `correctAnswer must be null or 1-${MAX_GUESS_LENGTH} characters` },
        { status: 400 },
      );
    }
  }

  return NextResponse.json(await setConferenceCorrectAnswer(correctAnswer));
}
