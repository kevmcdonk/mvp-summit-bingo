import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCardsContainer, getProgressContainer } from '@/lib/cosmos';
import { computeProgress } from '@/lib/bingo';
import { BingoCard, BingoProgress } from '@/types';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id || session.user.email;

  let body: { index: number; marked: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { index, marked } = body;
  if (typeof index !== 'number' || index < 0 || index > 24) {
    return NextResponse.json({ error: 'Invalid index. Must be 0-24.' }, { status: 400 });
  }

  try {
    const cardsContainer = getCardsContainer();
    const cardQuery = await cardsContainer.items
      .query<BingoCard>({ query: 'SELECT * FROM c WHERE c.userId = @userId', parameters: [{ name: '@userId', value: userId }] })
      .fetchAll();

    if (cardQuery.resources.length === 0) {
      return NextResponse.json({ error: 'No card found. Please visit /api/card first.' }, { status: 404 });
    }

    const card = cardQuery.resources[0];

    const progressContainer = getProgressContainer();
    const progressQuery = await progressContainer.items
      .query<BingoProgress>({ query: 'SELECT * FROM c WHERE c.cardId = @cardId', parameters: [{ name: '@cardId', value: card.id }] })
      .fetchAll();

    if (progressQuery.resources.length === 0) {
      return NextResponse.json({ error: 'No progress found.' }, { status: 404 });
    }

    const progress = progressQuery.resources[0];

    // Validate ownership
    if (progress.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update marked indexes
    let markedIndexes = [...progress.markedIndexes];
    if (marked) {
      if (!markedIndexes.includes(index)) {
        markedIndexes.push(index);
      }
    } else {
      markedIndexes = markedIndexes.filter((i) => i !== index);
    }

    const computed = computeProgress(progress, markedIndexes);
    const updatedProgress: BingoProgress = {
      ...progress,
      ...computed,
    };

    await progressContainer.item(progress.id, progress.id).replace(updatedProgress);
    return NextResponse.json(updatedProgress);
  } catch (error) {
    console.error('Error toggling card:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
