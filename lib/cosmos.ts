import { CosmosClient, Container, Database } from '@azure/cosmos';
import { Phrase, UserProfile, BingoCard, BingoProgress, ConferenceGuess, ConferenceGuessSettings } from './types';
import { CONFERENCE_GUESS_SETTINGS_ID } from './conferenceGuess';
import { logError, logWarn } from './logger';

let client: CosmosClient | null = null;
let database: Database | null = null;
let initializationPromise: Promise<void> | null = null;

function getClient(): CosmosClient {
  if (!client) {
    const endpoint = process.env.COSMOS_ENDPOINT;
    const key = process.env.COSMOS_KEY;
    if (!endpoint || !key) {
      throw new Error('COSMOS_ENDPOINT and COSMOS_KEY environment variables are required');
    }
    client = new CosmosClient({ endpoint, key });
  }
  return client;
}

function getDatabase(): Database {
  const dbName = process.env.COSMOS_DATABASE ?? 'bingo';
  if (!database) {
    database = getClient().database(dbName);
  }

  if (!initializationPromise) {
    initializationPromise = getClient()
      .databases.createIfNotExists({ id: dbName })
      .then((response) => {
        database = response.database;
      });
  }

  return database;
}

async function ensureCosmosResources(): Promise<void> {
  getDatabase();

  try {
    await initializationPromise;

    const containerNames = [
      process.env.COSMOS_CONTAINER_PHRASES ?? 'phrases',
      process.env.COSMOS_CONTAINER_USERS ?? 'users',
      process.env.COSMOS_CONTAINER_CARDS ?? 'cards',
      process.env.COSMOS_CONTAINER_PROGRESS ?? 'progress',
      process.env.COSMOS_CONTAINER_CONFERENCE_GUESSES ?? 'conference-guesses',
      process.env.COSMOS_CONTAINER_SETTINGS ?? 'settings',
    ];

    await Promise.all(
      containerNames.map((containerName) =>
        getDatabase().containers.createIfNotExists({
          id: containerName,
          partitionKey: { paths: ['/id'] },
        }),
      ),
    );
  } catch (error) {
    logError('Failed to initialize Cosmos DB resources', error, {
      database: process.env.COSMOS_DATABASE ?? 'bingo',
    });
    initializationPromise = null;
    throw error;
  }
}

function getContainer(name: string): Container {
  return getDatabase().container(name);
}

function phrasesContainer(): Container {
  return getContainer(process.env.COSMOS_CONTAINER_PHRASES ?? 'phrases');
}

function usersContainer(): Container {
  return getContainer(process.env.COSMOS_CONTAINER_USERS ?? 'users');
}

function cardsContainer(): Container {
  return getContainer(process.env.COSMOS_CONTAINER_CARDS ?? 'cards');
}

function progressContainer(): Container {
  return getContainer(process.env.COSMOS_CONTAINER_PROGRESS ?? 'progress');
}

function conferenceGuessesContainer(): Container {
  return getContainer(process.env.COSMOS_CONTAINER_CONFERENCE_GUESSES ?? 'conference-guesses');
}

function settingsContainer(): Container {
  return getContainer(process.env.COSMOS_CONTAINER_SETTINGS ?? 'settings');
}

// --- Phrases ---

export async function getPhrases(): Promise<Phrase[]> {
  await ensureCosmosResources();
  const { resources } = await phrasesContainer().items.readAll<Phrase>().fetchAll();
  return resources;
}

export async function getPhraseById(id: string): Promise<Phrase | null> {
  await ensureCosmosResources();
  try {
    const { resource } = await phrasesContainer().item(id, id).read<Phrase>();
    return resource ?? null;
  } catch (error) {
    logWarn('Failed to load phrase by id', { id, error: String(error) });
    return null;
  }
}

export async function createPhrase(phrase: Omit<Phrase, 'id'>): Promise<Phrase> {
  await ensureCosmosResources();
  const { v4: uuidv4 } = await import('uuid');
  const newPhrase: Phrase = { id: uuidv4(), ...phrase };
  const { resource } = await phrasesContainer().items.create<Phrase>(newPhrase);
  if (!resource) {
    const error = new Error('Failed to create phrase');
    logError('Phrase create returned empty resource', error, { phrase: newPhrase });
    throw error;
  }
  return resource;
}

export async function updatePhrase(phrase: Phrase): Promise<Phrase> {
  await ensureCosmosResources();
  const { resource } = await phrasesContainer().items.upsert<Phrase>(phrase);
  if (!resource) {
    const error = new Error('Failed to update phrase');
    logError('Phrase upsert returned empty resource', error, { phraseId: phrase.id });
    throw error;
  }
  return resource;
}

export async function deletePhrase(id: string): Promise<void> {
  await ensureCosmosResources();
  await phrasesContainer().item(id, id).delete();
}

// --- UserProfile ---

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  await ensureCosmosResources();
  try {
    const { resource } = await usersContainer().item(userId, userId).read<UserProfile>();
    return resource ?? null;
  } catch (error) {
    logWarn('Failed to load user profile', { userId, error: String(error) });
    return null;
  }
}

export async function upsertUserProfile(profile: UserProfile): Promise<UserProfile> {
  await ensureCosmosResources();
  const { resource } = await usersContainer().items.upsert<UserProfile>(profile);
  if (!resource) {
    const error = new Error('Failed to upsert user profile');
    logError('User profile upsert returned empty resource', error, { userId: profile.id });
    throw error;
  }
  return resource;
}

export async function getAllUserProfiles(): Promise<UserProfile[]> {
  await ensureCosmosResources();
  const { resources } = await usersContainer().items.readAll<UserProfile>().fetchAll();
  return resources;
}

// --- BingoCard ---

export async function getCard(userId: string): Promise<BingoCard | null> {
  await ensureCosmosResources();
  const query = {
    query: 'SELECT * FROM c WHERE c.userId = @userId',
    parameters: [{ name: '@userId', value: userId }],
  };
  const { resources } = await cardsContainer().items.query<BingoCard>(query).fetchAll();
  return resources[0] ?? null;
}

export async function createCard(card: BingoCard): Promise<BingoCard> {
  await ensureCosmosResources();
  const { resource } = await cardsContainer().items.create<BingoCard>(card);
  if (!resource) {
    const error = new Error('Failed to create card');
    logError('Card create returned empty resource', error, { cardId: card.id, userId: card.userId });
    throw error;
  }
  return resource;
}

// --- BingoProgress ---

export async function getProgress(userId: string): Promise<BingoProgress | null> {
  await ensureCosmosResources();
  const query = {
    query: 'SELECT * FROM c WHERE c.userId = @userId',
    parameters: [{ name: '@userId', value: userId }],
  };
  const { resources } = await progressContainer().items.query<BingoProgress>(query).fetchAll();
  return resources[0] ?? null;
}

export async function upsertProgress(progress: BingoProgress): Promise<BingoProgress> {
  await ensureCosmosResources();
  const { resource } = await progressContainer().items.upsert<BingoProgress>(progress);
  if (!resource) {
    const error = new Error('Failed to upsert progress');
    logError('Progress upsert returned empty resource', error, {
      progressId: progress.id,
      userId: progress.userId,
    });
    throw error;
  }
  return resource;
}

export async function getAllProgress(): Promise<BingoProgress[]> {
  await ensureCosmosResources();
  const { resources } = await progressContainer().items.readAll<BingoProgress>().fetchAll();
  return resources;
}

// --- Conference guesses ---

function errorCode(error: unknown): number | undefined {
  return (error as { code?: number }).code;
}

export async function getAllConferenceGuesses(): Promise<ConferenceGuess[]> {
  await ensureCosmosResources();
  const { resources } = await conferenceGuessesContainer().items.readAll<ConferenceGuess>().fetchAll();
  return resources;
}

/**
 * Creates or updates the user's single guess, appending every submission to its history.
 * Uses optimistic concurrency so concurrent submissions never drop history entries.
 */
export async function saveConferenceGuess(
  user: { userId: string; displayName: string; email: string },
  location: string,
): Promise<ConferenceGuess> {
  await ensureCosmosResources();
  const container = conferenceGuessesContainer();

  for (let attempt = 0; attempt < 3; attempt++) {
    const now = new Date().toISOString();
    const entry = { location, submittedAt: now };

    let existing: ConferenceGuess | undefined;
    let etag: string | undefined;
    try {
      const response = await container.item(user.userId, user.userId).read<ConferenceGuess>();
      existing = response.resource;
      etag = response.etag;
    } catch (error) {
      if (errorCode(error) !== 404) throw error;
    }

    try {
      if (existing && existing.location === location) {
        return existing;
      }
      if (!existing) {
        const guess: ConferenceGuess = {
          id: user.userId,
          userId: user.userId,
          displayName: user.displayName,
          email: user.email,
          location,
          createdAt: now,
          updatedAt: now,
          history: [entry],
        };
        const { resource } = await container.items.create<ConferenceGuess>(guess);
        return resource ?? guess;
      }

      const updated: ConferenceGuess = {
        ...existing,
        displayName: user.displayName,
        email: user.email,
        location,
        updatedAt: now,
        history: [...(existing.history ?? []), entry],
      };
      const { resource } = await container
        .item(user.userId, user.userId)
        .replace<ConferenceGuess>(updated, { accessCondition: { type: 'IfMatch', condition: etag! } });
      return resource ?? updated;
    } catch (error) {
      const code = errorCode(error);
      if (code === 409 || code === 412) continue;
      logError('Conference guess save failed', error, { userId: user.userId });
      throw error;
    }
  }

  throw new Error('Could not save guess due to concurrent updates; please retry');
}

export async function getConferenceGuessSettings(): Promise<ConferenceGuessSettings> {
  await ensureCosmosResources();
  try {
    const { resource } = await settingsContainer()
      .item(CONFERENCE_GUESS_SETTINGS_ID, CONFERENCE_GUESS_SETTINGS_ID)
      .read<ConferenceGuessSettings>();
    if (resource) return resource;
  } catch (error) {
    if (errorCode(error) !== 404) {
      logWarn('Failed to load conference guess settings', { error: String(error) });
    }
  }
  return { id: CONFERENCE_GUESS_SETTINGS_ID, correctAnswer: null, updatedAt: new Date().toISOString() };
}

export async function setConferenceCorrectAnswer(correctAnswer: string | null): Promise<ConferenceGuessSettings> {
  await ensureCosmosResources();
  const settings: ConferenceGuessSettings = {
    id: CONFERENCE_GUESS_SETTINGS_ID,
    correctAnswer,
    updatedAt: new Date().toISOString(),
  };
  const { resource } = await settingsContainer().items.upsert<ConferenceGuessSettings>(settings);
  if (!resource) {
    const error = new Error('Failed to save conference guess settings');
    logError('Conference guess settings upsert returned empty resource', error);
    throw error;
  }
  return resource;
}

// --- Reset ---

async function deleteAllItems(container: Container): Promise<number> {
  const { resources } = await container.items
    .query<{ id: string }>('SELECT c.id FROM c')
    .fetchAll();
  const batchSize = 20;
  let deleted = 0;
  for (let i = 0; i < resources.length; i += batchSize) {
    const batch = resources.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async ({ id }) => {
        try {
          // Every container is partitioned on /id.
          await container.item(id, id).delete();
          deleted++;
        } catch (error) {
          if ((error as { code?: number }).code !== 404) throw error;
        }
      }),
    );
  }
  return deleted;
}

/** Deletes every user profile, bingo card and progress record. Phrases and guesses are untouched. */
export async function deleteAllUsersAndCards(): Promise<{ users: number; cards: number; progress: number }> {
  await ensureCosmosResources();
  try {
    const [users, cards, progress] = await Promise.all([
      deleteAllItems(usersContainer()),
      deleteAllItems(cardsContainer()),
      deleteAllItems(progressContainer()),
    ]);
    return { users, cards, progress };
  } catch (error) {
    logError('Failed to delete all users and cards', error);
    throw error;
  }
}

async function deleteItemsForUser(container: Container, userId: string): Promise<number> {
  const { resources } = await container.items
    .query<{ id: string }>({
      query: 'SELECT c.id FROM c WHERE c.userId = @userId',
      parameters: [{ name: '@userId', value: userId }],
    })
    .fetchAll();
  let deleted = 0;
  for (const { id } of resources) {
    try {
      await container.item(id, id).delete();
      deleted++;
    } catch (error) {
      if ((error as { code?: number }).code !== 404) throw error;
    }
  }
  return deleted;
}

/** Deletes one user's bingo card and progress; their profile is kept so a fresh card is generated on next visit. */
export async function deleteUserCardAndProgress(userId: string): Promise<{ cards: number; progress: number }> {
  await ensureCosmosResources();
  try {
    const [cards, progress] = await Promise.all([
      deleteItemsForUser(cardsContainer(), userId),
      deleteItemsForUser(progressContainer(), userId),
    ]);
    return { cards, progress };
  } catch (error) {
    logError('Failed to delete user card and progress', error, { userId });
    throw error;
  }
}

export async function deleteConferenceGuess(userId: string): Promise<boolean> {
  await ensureCosmosResources();
  try {
    await conferenceGuessesContainer().item(userId, userId).delete();
    return true;
  } catch (error) {
    if ((error as { code?: number }).code === 404) return false;
    logError('Failed to delete conference guess', error, { userId });
    throw error;
  }
}

export async function deleteAllConferenceGuesses(): Promise<number> {
  await ensureCosmosResources();
  return deleteAllItems(conferenceGuessesContainer());
}
