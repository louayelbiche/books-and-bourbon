/**
 * Write Tool Support
 *
 * Interface and utilities for tools that modify state (cart, bookings, etc.).
 * Write tools require user confirmation before execution.
 */

import type { AgentTool } from '@runwell/agent-core';

/**
 * Write tool - a tool that modifies state and requires confirmation
 */
export interface WriteTool extends AgentTool {
  /**
   * Whether this tool requires user confirmation before execution
   */
  requiresConfirmation: true;

  /**
   * Generate a human-readable confirmation message
   *
   * @param args - The arguments passed to the tool
   * @returns A message asking the user to confirm the action
   *
   * @example
   * confirmationMessage: (args) =>
   *   `Add ${args.quantity}x ${args.productName} to your cart?`
   */
  confirmationMessage: (args: Record<string, unknown>) => string;

  /**
   * Optional: Actions to show as buttons in the confirmation
   */
  confirmationActions?: {
    confirm: string; // e.g., "Yes, add to cart"
    cancel: string; // e.g., "No, cancel"
  };
}

/**
 * Write tool result - includes confirmation status
 */
export interface WriteToolResult<T = unknown> {
  /** Whether the action was confirmed by the user */
  confirmed: boolean;
  /** Whether the action was executed successfully */
  success: boolean;
  /** The result data if successful */
  data?: T;
  /** Error message if failed */
  error?: string;
  /** Message to display to the user */
  message: string;
}

/**
 * Pending write operation awaiting confirmation
 */
export interface PendingWriteOperation {
  /** Unique ID for this operation */
  id: string;
  /** Tool name */
  toolName: string;
  /** Tool arguments */
  args: Record<string, unknown>;
  /** Confirmation message shown to user */
  confirmationMessage: string;
  /** When the operation was created */
  createdAt: Date;
  /** When the operation expires (user must confirm before) */
  expiresAt: Date;
}

/**
 * Write tool executor - handles confirmation flow
 */
export interface WriteToolExecutor {
  /**
   * Request execution of a write tool
   * Returns a pending operation that needs confirmation
   */
  requestExecution(
    tool: WriteTool,
    args: Record<string, unknown>
  ): Promise<PendingWriteOperation>;

  /**
   * Confirm a pending operation
   */
  confirmOperation(operationId: string): Promise<WriteToolResult>;

  /**
   * Cancel a pending operation
   */
  cancelOperation(operationId: string): Promise<void>;

  /**
   * Get pending operations for a session
   */
  getPendingOperations(sessionId: string): Promise<PendingWriteOperation[]>;
}

/**
 * Check if a tool is a write tool
 */
export function isWriteTool(tool: AgentTool): tool is WriteTool {
  return 'requiresConfirmation' in tool && tool.requiresConfirmation === true;
}

/**
 * Create a write tool from a base tool definition
 */
export function createWriteTool(
  base: Omit<AgentTool, 'execute'> & {
    confirmationMessage: WriteTool['confirmationMessage'];
    confirmationActions?: WriteTool['confirmationActions'];
    execute: AgentTool['execute'];
  }
): WriteTool {
  return {
    ...base,
    requiresConfirmation: true,
  };
}

/**
 * Simple in-memory pending operations store
 */
export class PendingOperationsStore {
  private operations: Map<string, PendingWriteOperation & { sessionId: string }> =
    new Map();
  private readonly expirationMs: number;

  constructor(expirationMs: number = 5 * 60 * 1000) {
    // Default 5 min
    this.expirationMs = expirationMs;
  }

  /**
   * Create a pending operation
   */
  create(
    sessionId: string,
    tool: WriteTool,
    args: Record<string, unknown>
  ): PendingWriteOperation {
    const now = new Date();
    const id = crypto.randomUUID();

    const operation: PendingWriteOperation & { sessionId: string } = {
      id,
      sessionId,
      toolName: tool.name,
      args,
      confirmationMessage: tool.confirmationMessage(args),
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.expirationMs),
    };

    this.operations.set(id, operation);
    this.cleanup();

    return operation;
  }

  /**
   * Get a pending operation
   */
  get(operationId: string): (PendingWriteOperation & { sessionId: string }) | null {
    const op = this.operations.get(operationId);
    if (!op) return null;

    // Check expiration
    if (new Date() > op.expiresAt) {
      this.operations.delete(operationId);
      return null;
    }

    return op;
  }

  /**
   * Delete a pending operation
   */
  delete(operationId: string): boolean {
    return this.operations.delete(operationId);
  }

  /**
   * Get all pending operations for a session
   */
  getForSession(sessionId: string): PendingWriteOperation[] {
    const now = new Date();
    const results: PendingWriteOperation[] = [];

    for (const op of this.operations.values()) {
      if (op.sessionId === sessionId && now <= op.expiresAt) {
        results.push(op);
      }
    }

    return results;
  }

  /**
   * Clean up expired operations
   */
  private cleanup(): void {
    const now = new Date();
    for (const [id, op] of this.operations) {
      if (now > op.expiresAt) {
        this.operations.delete(id);
      }
    }
  }
}
