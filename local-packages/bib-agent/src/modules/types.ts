/**
 * BibAgentModule — Module interface for BIB agent extensions
 *
 * Modules extend BibAgent behavior by:
 * - Providing additional tools (cards, panels)
 * - Adding configuration (streaming, security)
 * - Hooking into the agent lifecycle via initialize()
 *
 * @see spec Phase 3a — Module System
 */

import type { BibTool } from '../tools/types.js';

/**
 * Interface that all BIB agent modules must implement.
 *
 * Modules are initialized when the agent initializes, and may
 * optionally contribute tools to the agent's tool set.
 */
export interface BibAgentModule {
  /** Unique module name (e.g., 'cards', 'panels', 'streaming', 'security') */
  name: string;

  /** Called during agent initialization with a reference to the agent */
  initialize(agent: any): void; // Use 'any' to avoid circular imports with BibAgent

  /** Optional: return tools this module contributes to the agent */
  getTools?(): BibTool[];
}
