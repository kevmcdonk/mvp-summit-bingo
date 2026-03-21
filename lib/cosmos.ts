import { CosmosClient, Container, Database } from '@azure/cosmos';
import { Phrase, UserProfile, BingoCard, BingoProgress } from './types';

let client: CosmosClient | null = null;
let database: Database | null = null;

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
  if (!database) {
    const dbName = process.env.COSMOS_DATABASE ?? 'bingo';
    database = getClient().database(dbName);
  }
  return database;
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
  const { resources } = await phrasesContainer().items.readAll<Phrase>().fetchAll();
  return resources;
}

export async function getPhraseById(id: string): Promise<Phrase | null> {
  try {
    const { resource } = await phrasesContainer().item(id, id).read<Phrase>();
    return resource ?? null;
  } catch {
    return null;
  }
}

export async function createPhrase(phrase: Omit<Phrase, 'id'>): Promise<Phrase> {
  const { v4: uuidv4 } = await import('uuid');
  const newPhrase: Phrase = { id: uuidv4(), ...phrase };
  const { resource } = await phrasesContainer().items.create<Phrase>(newPhrase);
  if (!resource) throw new Error('Failed to create phrase');
  return resource;
}

export async function updatePhrase(phrase: Phrase): Promise<Phrase> {
  const { resource } = await phrasesContainer().items.upsert<Phrase>(phrase);
  if (!resource) throw new Error('Failed to update phrase');
  return resource;
}

export async function deletePhrase(id: string): Promise<void> {
  await phrasesContainer().item(id, id).delete();
}

// --- UserProfile ---

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { resource } = await usersContainer().item(userId, userId).read<UserProfile>();
    return resource ?? null;
  } catch {
    return null;
  }
}

export async function upsertUserProfile(profile: UserProfile): Promise<UserProfile> {
  const { resource } = await usersContainer().items.upsert<UserProfile>(profile);
  if (!resource) throw new Error('Failed to upsert user profile');
  return resource;
}

export async function getAllUserProfiles(): Promise<UserProfile[]> {
  const { resources } = await usersContainer().items.readAll<UserProfile>().fetchAll();
  return resources;
}

// --- BingoCard ---

export async function getCard(userId: string): Promise<BingoCard | null> {
  const query = {
    query: 'SELECT * FROM c WHERE c.userId = @userId',
    parameters: [{ name: '@userId', value: userId }],
  };
  const { resources } = await cardsContainer().items.query<BingoCard>(query).fetchAll();
  return resources[0] ?? null;
}

export async function createCard(card: BingoCard): Promise<BingoCard> {
  const { resource } = await cardsContainer().items.create<BingoCard>(card);
  if (!resource) throw new Error('Failed to create card');
  return resource;
}

// --- BingoProgress ---

export async function getProgress(userId: string): Promise<BingoProgress | null> {
  const query = {
    query: 'SELECT * FROM c WHERE c.userId = @userId',
    parameters: [{ name: '@userId', value: userId }],
  };
  const { resources } = await progressContainer().items.query<BingoProgress>(query).fetchAll();
  return resources[0] ?? null;
}

export async function upsertProgress(progress: BingoProgress): Promise<BingoProgress> {
  const { resource } = await progressContainer().items.upsert<BingoProgress>(progress);
  if (!resource) throw new Error('Failed to upsert progress');
  return resource;
}

export async function getAllProgress(): Promise<BingoProgress[]> {
  const { resources } = await progressContainer().items.readAll<BingoProgress>().fetchAll();
  return resources;
}
