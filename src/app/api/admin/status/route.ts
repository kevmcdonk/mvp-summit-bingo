import { NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { getProgressContainer, getUsersContainer } from '@/lib/cosmos';
import { AdminUserStatus, BingoProgress, UserProfile } from '@/types';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const usersContainer = getUsersContainer();
    const usersResult = await usersContainer.items.query<UserProfile>('SELECT * FROM c').fetchAll();
    const users = usersResult.resources;

    const progressContainer = getProgressContainer();
    const progressResult = await progressContainer.items.query<BingoProgress>('SELECT * FROM c').fetchAll();
    const progressMap = new Map(progressResult.resources.map((p) => [p.userId, p]));

    const statuses: AdminUserStatus[] = users.map((user) => {
      const progress = progressMap.get(user.id);
      return {
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        markedCount: progress?.markedIndexes.length ?? 0,
        linesCompleted: progress?.linesCompleted ?? 0,
        hasHouse: progress?.hasHouse ?? false,
        hasBingo: progress?.hasBingo ?? false,
        updatedAt: progress?.updatedAt ?? user.updatedAt,
      };
    });

    return NextResponse.json(statuses);
  } catch (error) {
    console.error('Error fetching admin status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
