import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteAllUsersAndCards, deleteUserCardAndProgress } from '@/lib/cosmos';
import { logWarn } from '@/lib/logger';
import { RESET_CONFIRMATION } from '@/lib/admin';

/**
 * `?userId=<id>`: deletes that user's bingo card and progress (profile kept; fresh card on next visit).
 * Otherwise deletes every user profile, bingo card and progress record.
 * Body: { confirm: "DELETE ALL USERS" } — guards against accidental calls.
 */
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; email?: string | null; roles?: string[] } | undefined;
  if (!user?.roles?.includes('admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const targetUserId = request.nextUrl.searchParams.get('userId');
  if (targetUserId !== null) {
    if (!targetUserId.trim()) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    logWarn('Admin reset: deleting user card and progress', { adminId: user.id, adminEmail: user.email, targetUserId });
    const deleted = await deleteUserCardAndProgress(targetUserId);
    return NextResponse.json({ deleted });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if ((body as Record<string, unknown> | null)?.confirm !== RESET_CONFIRMATION) {
    return NextResponse.json({ error: `confirm must equal "${RESET_CONFIRMATION}"` }, { status: 400 });
  }

  logWarn('Admin reset: deleting all users, cards and progress', { adminId: user.id, adminEmail: user.email });
  const deleted = await deleteAllUsersAndCards();
  return NextResponse.json({ deleted });
}
