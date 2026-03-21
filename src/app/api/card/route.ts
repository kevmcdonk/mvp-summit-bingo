import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCardsContainer, getPhrasesContainer, getProgressContainer, getUsersContainer } from '@/lib/cosmos';
import { generateCard } from '@/lib/bingo';
import { BingoCard, BingoProgress, CardWithProgress, Phrase, UserProfile } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id || session.user.email;
  const email = session.user.email;
  const displayName = session.user.name || email;

  try {
    // Upsert user profile
    const usersContainer = getUsersContainer();
    let userProfile: UserProfile;
    try {
      const { resource } = await usersContainer.item(userId, userId).read<UserProfile>();
      userProfile = resource!;
      userProfile.updatedAt = new Date().toISOString();
      await usersContainer.item(userId, userId).replace(userProfile);
    } catch {
      userProfile = {
        id: userId,
        email,
        displayName,
        roles: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await usersContainer.items.create(userProfile);
    }

    // Get or create bingo card
    const cardsContainer = getCardsContainer();
    const cardQuery = await cardsContainer.items
      .query<BingoCard>({ query: 'SELECT * FROM c WHERE c.userId = @userId', parameters: [{ name: '@userId', value: userId }] })
      .fetchAll();

    let card: BingoCard;
    if (cardQuery.resources.length > 0) {
      card = cardQuery.resources[0];
    } else {
      // Fetch active phrases
      const phrasesContainer = getPhrasesContainer();
      const phrasesResult = await phrasesContainer.items
        .query<Phrase>({ query: 'SELECT * FROM c WHERE c.isActive = true' })
        .fetchAll();
      const phrases = phrasesResult.resources;
      if (phrases.length < 25) {
        return NextResponse.json({ error: `Not enough active phrases. Need 25, found ${phrases.length}` }, { status: 400 });
      }
      const phraseIds = generateCard(phrases.map((p) => p.id));
      card = {
        id: uuidv4(),
        userId,
        phrases: phraseIds,
        generatedAt: new Date().toISOString(),
      };
      await cardsContainer.items.create(card);
    }

    // Get or create progress
    const progressContainer = getProgressContainer();
    const progressQuery = await progressContainer.items
      .query<BingoProgress>({ query: 'SELECT * FROM c WHERE c.cardId = @cardId', parameters: [{ name: '@cardId', value: card.id }] })
      .fetchAll();

    let progress: BingoProgress;
    if (progressQuery.resources.length > 0) {
      progress = progressQuery.resources[0];
    } else {
      progress = {
        id: uuidv4(),
        userId,
        cardId: card.id,
        markedIndexes: [],
        linesCompleted: 0,
        hasHouse: false,
        hasBingo: false,
        updatedAt: new Date().toISOString(),
      };
      await progressContainer.items.create(progress);
    }

    // Fetch phrases details
    const phrasesContainer = getPhrasesContainer();
    const phraseDetails: Phrase[] = [];
    for (const phraseId of card.phrases) {
      try {
        const { resource } = await phrasesContainer.item(phraseId, phraseId).read<Phrase>();
        if (resource) phraseDetails.push(resource);
      } catch {
        phraseDetails.push({ id: phraseId, text: 'Unknown phrase', isActive: true, category: null });
      }
    }

    const result: CardWithProgress = { card, progress, phrases: phraseDetails };
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching card:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
