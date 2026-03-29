import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPhrases, getUserProfile, upsertUserProfile, getCard, createCard, getProgress, upsertProgress } from '@/lib/cosmos';
import { generateCard } from '@/lib/bingo';
import { v4 as uuidv4 } from 'uuid';
import { UserProfile, BingoCard, BingoProgress } from '@/lib/types';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as { id: string; email?: string; name?: string; roles?: string[] };
  const userId = user.id;
  const now = new Date().toISOString();

  // Upsert user profile
  let profile = await getUserProfile(userId);
  if (!profile) {
    const newProfile: UserProfile = {
      id: userId,
      email: user.email ?? '',
      displayName: user.name ?? '',
      roles: user.roles ?? [],
      createdAt: now,
      updatedAt: now,
    };
    profile = await upsertUserProfile(newProfile);
  }

  // Get or create card
  let card = await getCard(userId);
  if (!card) {
    // New user: require them to choose in-person vs remote before card generation
    if (profile.isInPerson === undefined) {
      return NextResponse.json({ needsPreference: true });
    }

    const phrases = await getPhrases();
    const phraseIds = generateCard(phrases, profile.isInPerson);
    const newCard: BingoCard = {
      id: uuidv4(),
      userId,
      phrases: phraseIds,
      generatedAt: now,
    };
    card = await createCard(newCard);
  }

  // Get or create progress
  let progress = await getProgress(userId);
  if (!progress) {
    const newProgress: BingoProgress = {
      id: uuidv4(),
      userId,
      cardId: card.id,
      markedIndexes: [],
      linesCompleted: 0,
      hasHouse: false,
      hasBingo: false,
      updatedAt: now,
    };
    progress = await upsertProgress(newProgress);
  }

  // Fetch all phrases for the card
  const allPhrases = await getPhrases();
  const cardPhrases = allPhrases.filter((p) => card!.phrases.includes(p.id));

  return NextResponse.json({ card, progress, phrases: cardPhrases });
}
