import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { getPhrasesContainer } from '@/lib/cosmos';
import { Phrase } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const container = getPhrasesContainer();
    const result = await container.items.query<Phrase>('SELECT * FROM c ORDER BY c.text').fetchAll();
    return NextResponse.json(result.resources);
  } catch (error) {
    console.error('Error fetching phrases:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { text: string; category?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  try {
    const container = getPhrasesContainer();
    const phrase: Phrase = {
      id: uuidv4(),
      text: body.text.trim(),
      isActive: true,
      category: body.category ?? null,
    };
    await container.items.create(phrase);
    return NextResponse.json(phrase, { status: 201 });
  } catch (error) {
    console.error('Error creating phrase:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
