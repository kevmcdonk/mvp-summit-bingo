import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllProgress } from '@/lib/cosmos';
import { getLeaderboardRank } from '@/lib/bingo';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id ?? '';
  const allProgress = await getAllProgress();
  const { rank, total } = getLeaderboardRank(userId, allProgress);

  return NextResponse.json({ rank, total });
}
