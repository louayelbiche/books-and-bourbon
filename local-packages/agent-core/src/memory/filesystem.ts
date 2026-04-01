/**
 * Filesystem Memory Implementation
 *
 * Stores sessions as JSON files on disk.
 * Suitable for development and single-instance deployments.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ChatMessage, SessionData } from '../types/index.js';
import type { SessionMemory } from './session.js';

/**
 * Configuration for filesystem memory
 */
export interface FilesystemMemoryConfig {
  /** Base directory for storing session files */
  baseDir: string;
  /** Maximum messages to keep per session (0 = unlimited) */
  maxMessages?: number;
}

const DEFAULT_CONFIG: FilesystemMemoryConfig = {
  baseDir: '/tmp/agent-sessions',
  maxMessages: 100,
};

/**
 * Filesystem-based session memory
 */
export class FilesystemMemory implements SessionMemory {
  private config: FilesystemMemoryConfig;
  private initialized: boolean = false;

  constructor(config?: Partial<FilesystemMemoryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Ensure base directory exists
   */
  private async ensureDir(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(this.config.baseDir, { recursive: true });
      this.initialized = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
      this.initialized = true;
    }
  }

  /**
   * Get file path for a session
   */
  private getSessionPath(sessionId: string): string {
    // Sanitize session ID to prevent path traversal
    const safeId = sessionId.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.config.baseDir, `${safeId}.json`);
  }

  /**
   * Read session from file
   */
  private async readSession(sessionId: string): Promise<SessionData | null> {
    try {
      const filePath = this.getSessionPath(sessionId);
      const data = await fs.readFile(filePath, 'utf-8');
      const session = JSON.parse(data) as SessionData;

      // Reconstruct Date objects
      session.startedAt = new Date(session.startedAt);
      session.lastActiveAt = new Date(session.lastActiveAt);
      for (const msg of session.messages) {
        if (msg.timestamp) {
          msg.timestamp = new Date(msg.timestamp);
        }
      }

      return session;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Write session to file
   */
  private async writeSession(session: SessionData): Promise<void> {
    await this.ensureDir();
    const filePath = this.getSessionPath(session.sessionId);
    await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');
  }

  // ===========================================================================
  // SessionMemory Interface Implementation
  // ===========================================================================

  async createSession(
    sessionId: string,
    clientId: string,
    options?: {
      userId?: string;
      goals?: string[];
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const session: SessionData = {
      sessionId,
      clientId,
      userId: options?.userId,
      startedAt: new Date(),
      lastActiveAt: new Date(),
      messages: [],
      goals: options?.goals,
      completed: false,
      metadata: options?.metadata,
    };

    await this.writeSession(session);
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    return this.readSession(sessionId);
  }

  async hasSession(sessionId: string): Promise<boolean> {
    try {
      await fs.access(this.getSessionPath(sessionId));
      return true;
    } catch {
      return false;
    }
  }

  async appendMessage(sessionId: string, message: ChatMessage): Promise<void> {
    const session = await this.readSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Add timestamp if not present
    if (!message.timestamp) {
      message.timestamp = new Date();
    }

    session.messages.push(message);
    session.lastActiveAt = new Date();

    // Trim messages if exceeding limit
    if (
      this.config.maxMessages &&
      this.config.maxMessages > 0 &&
      session.messages.length > this.config.maxMessages
    ) {
      session.messages = session.messages.slice(-this.config.maxMessages);
    }

    await this.writeSession(session);
  }

  async getHistory(sessionId: string, limit?: number): Promise<ChatMessage[]> {
    const session = await this.readSession(sessionId);
    if (!session) {
      return [];
    }

    if (limit && limit > 0) {
      return session.messages.slice(-limit);
    }

    return session.messages;
  }

  async touchSession(sessionId: string): Promise<void> {
    const session = await this.readSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.lastActiveAt = new Date();
    await this.writeSession(session);
  }

  async completeSession(sessionId: string): Promise<void> {
    const session = await this.readSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.completed = true;
    session.lastActiveAt = new Date();
    await this.writeSession(session);
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await fs.unlink(this.getSessionPath(sessionId));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async getClientSessions(clientId: string): Promise<SessionData[]> {
    await this.ensureDir();

    const files = await fs.readdir(this.config.baseDir);
    const sessions: SessionData[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const sessionId = file.replace('.json', '');
      const session = await this.readSession(sessionId);

      if (session && session.clientId === clientId) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  async cleanupExpiredSessions(maxAgeMs: number): Promise<number> {
    await this.ensureDir();

    const files = await fs.readdir(this.config.baseDir);
    const now = Date.now();
    let cleaned = 0;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const sessionId = file.replace('.json', '');
      const session = await this.readSession(sessionId);

      if (session) {
        const age = now - session.lastActiveAt.getTime();
        if (age > maxAgeMs) {
          await this.deleteSession(sessionId);
          cleaned++;
        }
      }
    }

    return cleaned;
  }

  async setSessionData(
    sessionId: string,
    key: string,
    value: unknown
  ): Promise<void> {
    const session = await this.readSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.metadata = session.metadata || {};
    session.metadata[key] = value;
    session.lastActiveAt = new Date();

    await this.writeSession(session);
  }

  async getSessionData(sessionId: string, key: string): Promise<unknown | null> {
    const session = await this.readSession(sessionId);
    if (!session || !session.metadata) {
      return null;
    }

    return session.metadata[key] ?? null;
  }
}

// Singleton instance
let instance: FilesystemMemory | null = null;

/**
 * Get or create a singleton FilesystemMemory instance
 */
export function getFilesystemMemory(
  config?: Partial<FilesystemMemoryConfig>
): FilesystemMemory {
  if (!instance) {
    instance = new FilesystemMemory(config);
  }
  return instance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetFilesystemMemory(): void {
  instance = null;
}
