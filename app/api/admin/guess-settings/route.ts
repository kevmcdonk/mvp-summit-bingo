import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGuessSettings, upsertGuessSettings } from '@/lib/cosmos';
import { isValidDateKey, parseInstant } from '@/lib/guess';

async function checkAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  const user = session.user as { roles?: string[] };
  return user.roles?.includes('admin') ?? false;
}

export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(await getGuessSettings());
}

/** Body: { correctAt?: string | null, windowStart?: string (YYYY-MM-DD) } */
export async function PUT(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (typeof parsed !== 'object' || parsed === null) throw new Error('Invalid body');
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const settings = await getGuessSettings();

  if ('correctAt' in body) {
    if (body.correctAt === null) {
      settings.correctAt = null;
    } else {
      const correct = parseInstant(body.correctAt);
      if (!correct) {
        return NextResponse.json({ error: 'correctAt must be an ISO date-time or null' }, { status: 400 });
      }
      settings.correctAt = correct.toISOString();
    }
  }

  if ('windowStart' in body) {
    if (!isValidDateKey(body.windowStart)) {
      return NextResponse.json({ error: 'windowStart must be a YYYY-MM-DD date' }, { status: 400 });
    }
    settings.windowStart = body.windowStart;
  }

  settings.updatedAt = new Date().toISOString();
  return NextResponse.json(await upsertGuessSettings(settings));
}
