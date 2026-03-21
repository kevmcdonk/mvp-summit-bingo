import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPhrases, createPhrase, updatePhrase, deletePhrase } from '@/lib/cosmos';
import { Phrase } from '@/lib/types';

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
  const phrases = await getPhrases();
  return NextResponse.json({ phrases });
}

export async function POST(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).text !== 'string' ||
    !(body as Record<string, unknown>).text ||
    typeof (body as Record<string, unknown>).isActive !== 'boolean'
  ) {
    return NextResponse.json({ error: 'text (string) and isActive (boolean) are required' }, { status: 400 });
  }
  const phrase = await createPhrase(body as Omit<Phrase, 'id'>);
  return NextResponse.json(phrase, { status: 201 });
}

export async function PUT(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).id !== 'string' ||
    !(body as Record<string, unknown>).id ||
    typeof (body as Record<string, unknown>).text !== 'string' ||
    !(body as Record<string, unknown>).text ||
    typeof (body as Record<string, unknown>).isActive !== 'boolean'
  ) {
    return NextResponse.json({ error: 'id (string), text (string), and isActive (boolean) are required' }, { status: 400 });
  }
  const phrase = await updatePhrase(body as Phrase);
  return NextResponse.json(phrase);
}

export async function DELETE(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
  }
  await deletePhrase(id);
  return NextResponse.json({ success: true });
}
