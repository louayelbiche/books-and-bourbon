/**
 * Session Memory Interface
 *
 * Defines the contract for session/conversation persistence.
 */

import type { ChatMessage, SessionData } from '../types/index.js';

/**
 * Session memory interface - all implementations must follow this contract
 */
export interface SessionMemory {
  /**
   * Create a new session
   */
  createSession(
    sessionId: string,
    clientId: string,
    options?: {
      userId?: string;
      goals?: string[];
      metadata?: Record<string, unknown>;
    }
  ): Promise<void>;

  /**
   * Get session data
   */
  getSession(sessionId: string): Promise<SessionData | null>;

  /**
   * Check if session exists
   */
  hasSession(sessionId: string): Promise<boolean>;

  /**
   * Append a message to the session
   */
  appendMessage(sessionId: string, message: ChatMessage): Promise<void>;

  /**
   * Get conversation history for a session
   */
  getHistory(sessionId: string, limit?: number): Promise<ChatMessage[]>;

  /**
   * Update session activity timestamp
   */
  touchSession(sessionId: string): Promise<void>;

  /**
   * Mark session as complete
   */
  completeSession(sessionId: string): Promise<void>;

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): Promise<void>;

  /**
   * Get all active sessions for a client
   */
  getClientSessions(clientId: string): Promise<SessionData[]>;

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(maxAgeMs: number): Promise<number>;

  /**
   * Store arbitrary data in session
   */
  setSessionData(
    sessionId: string,
    key: string,
    value: unknown
  ): Promise<void>;

  /**
   * Get arbitrary data from session
   */
  getSessionData(sessionId: string, key: string): Promise<unknown | null>;
}
