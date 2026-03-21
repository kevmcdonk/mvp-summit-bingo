import { CosmosClient, Database, Container } from '@azure/cosmos';

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
    const dbName = process.env.COSMOS_DATABASE;
    if (!dbName) {
      throw new Error('COSMOS_DATABASE environment variable is required');
    }
    database = getClient().database(dbName);
  }
  return database;
}

export function getPhrasesContainer(): Container {
  const containerName = process.env.COSMOS_CONTAINER_PHRASES || 'phrases';
  return getDatabase().container(containerName);
}

export function getUsersContainer(): Container {
  const containerName = process.env.COSMOS_CONTAINER_USERS || 'users';
  return getDatabase().container(containerName);
}

export function getCardsContainer(): Container {
  const containerName = process.env.COSMOS_CONTAINER_CARDS || 'cards';
  return getDatabase().container(containerName);
}

export function getProgressContainer(): Container {
  const containerName = process.env.COSMOS_CONTAINER_PROGRESS || 'progress';
  return getDatabase().container(containerName);
}
