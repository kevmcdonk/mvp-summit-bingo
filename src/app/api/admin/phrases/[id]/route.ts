import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { getPhrasesContainer } from '@/lib/cosmos';
import { Phrase } from '@/types';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Partial<Pick<Phrase, 'text' | 'isActive' | 'category'>>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { id } = await params;
  try {
    const container = getPhrasesContainer();
    const { resource } = await container.item(id, id).read<Phrase>();
    if (!resource) {
      return NextResponse.json({ error: 'Phrase not found' }, { status: 404 });
    }
    const updated: Phrase = {
      ...resource,
      ...body,
    };
    await container.item(id, id).replace(updated);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating phrase:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  try {
    const container = getPhrasesContainer();
    await container.item(id, id).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting phrase:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
