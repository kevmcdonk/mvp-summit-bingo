import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllProgress } from '@/lib/cosmos';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as { roles?: string[] };
  if (!user.roles?.includes('admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const progressList = await getAllProgress();

  const totals: Record<string, number> = {};
  for (const progress of progressList) {
    for (const [phraseId, count] of Object.entries(progress.phraseCounts ?? {})) {
      totals[phraseId] = (totals[phraseId] ?? 0) + count;
    }
  }

  return NextResponse.json({ phraseCounts: totals });
}
