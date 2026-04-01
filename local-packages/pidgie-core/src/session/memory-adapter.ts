/**
 * In-Memory Session Adapter
 *
 * Default session storage using an in-memory Map.
 * Suitable for development and single-instance deployments.
 */

import type { SessionAdapter, SessionData } from './types.js';

/**
 * In-memory session adapter using Map
 */
export class MemorySessionAdapter<TContext = Record<string, unknown>>
  implements SessionAdapter<TContext>
{
  private sessions: Map<string, SessionData<TContext>> = new Map();

  async get(id: string): Promise<SessionData<TContext> | null> {
    return this.sessions.get(id) ?? null;
  }

  async set(id: string, session: SessionData<TContext>): Promise<void> {
    this.sessions.set(id, session);
  }

  async delete(id: string): Promise<boolean> {
    return this.sessions.delete(id);
  }

  async keys(): Promise<string[]> {
    return Array.from(this.sessions.keys());
  }

  async clear(): Promise<void> {
    this.sessions.clear();
  }

  async size(): Promise<number> {
    return this.sessions.size;
  }
}

/**
 * Create a memory adapter instance
 */
export function createMemoryAdapter<
  TContext = Record<string, unknown>,
>(): MemorySessionAdapter<TContext> {
  return new MemorySessionAdapter<TContext>();
}
