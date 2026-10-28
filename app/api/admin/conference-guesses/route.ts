import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteAllConferenceGuesses, deleteConferenceGuess, getAllConferenceGuesses, getConferenceGuessSettings, setConferenceCorrectAnswer } from '@/lib/cosmos';
import { isCorrectGuess, MAX_GUESS_LENGTH, sanitizeLocation } from '@/lib/conferenceGuess';
import { logWarn } from '@/lib/logger';

async function getAdmin() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; email?: string | null; roles?: string[] } | undefined;
  return user?.roles?.includes('admin') ? user : null;
}

async function checkAdmin() {
  return (await getAdmin()) !== null;
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

/**
 * Deletes guesses (including their history).
 * ?userId=<id> deletes one user's guess; ?all=true deletes every guess.
 */
export async function DELETE(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const all = searchParams.get('all') === 'true';

  if (all) {
    logWarn('Admin deleting all conference guesses', { adminId: admin.id, adminEmail: admin.email });
    const deleted = await deleteAllConferenceGuesses();
    return NextResponse.json({ deleted });
  }

  if (!userId) {
    return NextResponse.json({ error: 'userId or all=true query parameter is required' }, { status: 400 });
  }

  logWarn('Admin deleting conference guess', { adminId: admin.id, adminEmail: admin.email, userId });
  const found = await deleteConferenceGuess(userId);
  if (!found) {
    return NextResponse.json({ error: 'Guess not found' }, { status: 404 });
  }
  return NextResponse.json({ deleted: 1 });
}
