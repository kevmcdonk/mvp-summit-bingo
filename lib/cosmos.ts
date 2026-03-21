import { CosmosClient, Container, Database } from '@azure/cosmos';
import { Phrase, UserProfile, BingoCard, BingoProgress } from './types';
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
