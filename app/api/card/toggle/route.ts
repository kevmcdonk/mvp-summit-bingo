import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCard, getProgress, upsertProgress } from '@/lib/cosmos';
import { detectLines, checkHouse, checkBingo } from '@/lib/bingo';
import { BingoProgress } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as { id: string };
  const userId = user.id;

  let body: { index: number; phraseId: string; marked: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { index, phraseId, marked } = body;
  if (typeof index !== 'number' || index < 0 || index > 24) {
    return NextResponse.json({ error: 'Invalid index: must be 0-24' }, { status: 400 });
  }
  if (typeof phraseId !== 'string' || !phraseId) {
    return NextResponse.json({ error: 'Invalid phraseId' }, { status: 400 });
  }

  const card = await getCard(userId);
  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  const now = new Date().toISOString();
  let progress = await getProgress(userId);
  if (!progress) {
    progress = {
      id: uuidv4(),
      userId,
      cardId: card.id,
      markedIndexes: [],
      linesCompleted: 0,
      hasHouse: false,
      hasBingo: false,
      updatedAt: now,
    } satisfies BingoProgress;
  }

  let markedIndexes = [...progress.markedIndexes];
  const phraseCounts: Record<string, number> = { ...(progress.phraseCounts ?? {}) };
  if (marked) {
    if (!markedIndexes.includes(index)) {
      markedIndexes.push(index);
    }
    phraseCounts[phraseId] = (phraseCounts[phraseId] ?? 0) + 1;
  } else {
    markedIndexes = markedIndexes.filter((i) => i !== index);
    delete phraseCounts[phraseId];
  }

  const lines = detectLines(markedIndexes);
  const hasHouse = checkHouse(markedIndexes);
  const hasBingo = checkBingo(markedIndexes);

  const updated: BingoProgress = {
    ...progress,
    markedIndexes,
    phraseCounts,
    linesCompleted: lines.length,
    hasHouse,
    hasBingo,
    updatedAt: now,
  };

  const saved = await upsertProgress(updated);
  return NextResponse.json(saved);
}
