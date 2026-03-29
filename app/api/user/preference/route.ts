import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserProfile, upsertUserProfile } from '@/lib/cosmos';
import { UserProfile } from '@/lib/types';

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    typeof (body as Record<string, unknown>).isInPerson !== 'boolean'
  ) {
    return NextResponse.json({ error: 'isInPerson (boolean) is required' }, { status: 400 });
  }

  const user = session.user as { id: string; email?: string; name?: string; roles?: string[] };
  const userId = user.id;
  const now = new Date().toISOString();

  let profile = await getUserProfile(userId);
  if (!profile) {
    const newProfile: UserProfile = {
      id: userId,
      email: user.email ?? '',
      displayName: user.name ?? '',
      roles: user.roles ?? [],
      isInPerson: (body as { isInPerson: boolean }).isInPerson,
      createdAt: now,
      updatedAt: now,
    };
    profile = await upsertUserProfile(newProfile);
  } else {
    profile = await upsertUserProfile({
      ...profile,
      isInPerson: (body as { isInPerson: boolean }).isInPerson,
      updatedAt: now,
    });
  }

  return NextResponse.json({ isInPerson: profile.isInPerson });
}
