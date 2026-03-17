/**
 * Bot memory for Books & Bourbon concierge.
 *
 * Connects to Postgres via BOT_MEMORY_DATABASE_URL. Creates bot_* tables.
 * Visitor identity: cookie-based (anonymous session).
 *
 * Graceful degradation: all getters return undefined when not configured.
 */

import { Pool } from 'pg';
import {
  ConversationStore,
  VisitorStore,
  ProfileSummarizer,
  ProfileInjector,
  createPersistenceAdapter,
  runMigration,
} from '@runwell/bot-memory';
import type { ConversationPersistence } from '@runwell/bot-memory';

declare global {
  // eslint-disable-next-line no-var
  var __bbBotMemoryPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __bbBotMemoryReady: boolean | undefined;
}

let memoryStoreInstance: ConversationPersistence | undefined;
let visitorStoreInstance: VisitorStore | undefined;
let conversationStoreInstance: ConversationStore | undefined;
let summarizerInstance: ProfileSummarizer | undefined;
let profileInjectorInstance: ProfileInjector | undefined;

function getPool(): Pool | null {
  const url = process.env.BOT_MEMORY_DATABASE_URL;
  if (!url) return null;

  if (global.__bbBotMemoryPool) return global.__bbBotMemoryPool;

  const pool = new Pool({
    connectionString: url,
    max: 3,
    idleTimeoutMillis: 30_000,
  });

  global.__bbBotMemoryPool = pool;
  return pool;
}

async function ensureMigrated(pool: Pool): Promise<void> {
  if (global.__bbBotMemoryReady) return;
  await runMigration(pool);
  global.__bbBotMemoryReady = true;
}

export async function getMemoryStore(): Promise<ConversationPersistence | undefined> {
  if (memoryStoreInstance) return memoryStoreInstance;

  const pool = getPool();
  if (!pool) return undefined;

  try {
    await ensureMigrated(pool);
    const conversationStore = new ConversationStore(pool);
    memoryStoreInstance = createPersistenceAdapter(conversationStore);
    return memoryStoreInstance;
  } catch (error) {
    console.error('[bot-memory:bb] Failed to initialize:', error);
    return undefined;
  }
}

export async function getVisitorStore(): Promise<VisitorStore | undefined> {
  if (visitorStoreInstance) return visitorStoreInstance;

  const pool = getPool();
  if (!pool) return undefined;

  try {
    await ensureMigrated(pool);
    visitorStoreInstance = new VisitorStore(pool);
    return visitorStoreInstance;
  } catch (error) {
    console.error('[bot-memory:bb] Failed to initialize VisitorStore:', error);
    return undefined;
  }
}

export async function getConversationStore(): Promise<ConversationStore | undefined> {
  if (conversationStoreInstance) return conversationStoreInstance;

  const pool = getPool();
  if (!pool) return undefined;

  try {
    await ensureMigrated(pool);
    conversationStoreInstance = new ConversationStore(pool);
    return conversationStoreInstance;
  } catch (error) {
    console.error('[bot-memory:bb] Failed to initialize ConversationStore:', error);
    return undefined;
  }
}

export async function getSummarizer(): Promise<ProfileSummarizer | undefined> {
  if (summarizerInstance) return summarizerInstance;

  const pool = getPool();
  if (!pool) return undefined;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return undefined;

  try {
    await ensureMigrated(pool);
    const visitorStore = await getVisitorStore();
    const conversationStore = await getConversationStore();
    if (!visitorStore || !conversationStore) return undefined;

    summarizerInstance = new ProfileSummarizer({
      visitorStore,
      conversationStore,
      llmCall: async (prompt: string) => {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        const usage = response.usageMetadata;
        return {
          text,
          tokensUsed: {
            input: usage?.promptTokenCount ?? 0,
            output: usage?.candidatesTokenCount ?? 0,
          },
        };
      },
    });

    return summarizerInstance;
  } catch (error) {
    console.error('[bot-memory:bb] Failed to initialize ProfileSummarizer:', error);
    return undefined;
  }
}

export async function getProfileInjector(): Promise<ProfileInjector | undefined> {
  if (profileInjectorInstance) return profileInjectorInstance;

  const visitorStore = await getVisitorStore();
  if (!visitorStore) return undefined;

  profileInjectorInstance = new ProfileInjector(visitorStore);
  return profileInjectorInstance;
}
