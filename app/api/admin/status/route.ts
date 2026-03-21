import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllUserProfiles, getAllProgress } from '@/lib/cosmos';
import { UserStatusSummary } from '@/lib/types';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as { roles?: string[] };
  if (!user.roles?.includes('admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [profiles, progressList] = await Promise.all([
    getAllUserProfiles(),
    getAllProgress(),
  ]);

  const progressMap = new Map(progressList.map((p) => [p.userId, p]));

  const summaries: UserStatusSummary[] = profiles.map((profile) => {
    const progress = progressMap.get(profile.id);
    return {
      userId: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      markedCount: progress?.markedIndexes.length ?? 0,
      linesCompleted: progress?.linesCompleted ?? 0,
      hasHouse: progress?.hasHouse ?? false,
      hasBingo: progress?.hasBingo ?? false,
      lastActivity: progress?.updatedAt ?? profile.updatedAt,
    };
  });

  return NextResponse.json({ users: summaries });
}
