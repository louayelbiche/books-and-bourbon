/**
 * toBibAgentTool — Adapter from BibTool to AgentTool
 *
 * Converts a BibTool (with BibToolContext) into an AgentTool (with AgentContext)
 * that BaseAgent can register and execute.
 *
 * Context injection is LAZY — the BibToolContext provider function is called
 * at execution time, not at registration time. This allows the DataContext
 * to be updated between tool calls within a conversation.
 *
 * @see spec Section 4 — ToolRegistry
 */

import type { AgentTool } from '@runwell/agent-core';
import type { BibTool, BibToolContext } from './types.js';

/**
 * A function that provides the current BibToolContext at execution time.
 * Called lazily when a tool executes, not at registration time.
 */
export type BibToolContextProvider = () => BibToolContext;

/**
 * Convert a BibTool into an AgentTool compatible with BaseAgent.
 *
 * @param bibTool - The BibTool to adapt
 * @param contextProvider - Function that returns the current BibToolContext (called lazily)
 * @returns An AgentTool that BaseAgent can register
 *
 * @example
 * ```typescript
 * const agentTool = toBibAgentTool(getBusinessInfoTool, () => ({
 *   dataContext: this.dataContext,
 *   tenantId: this.tenantId,
 *   mode: 'dashboard',
 * }));
 * this.registerTools([agentTool]);
 * ```
 */
export function toBibAgentTool(
  bibTool: BibTool,
  contextProvider: BibToolContextProvider
): AgentTool {
  return {
    name: bibTool.name,
    description: bibTool.description,
    parameters: bibTool.parameters,
    execute: async (args: Record<string, unknown>) => {
      // Lazy context resolution — get fresh context at execution time
      const ctx = contextProvider();
      return bibTool.execute(args, ctx);
    },
  };
}
