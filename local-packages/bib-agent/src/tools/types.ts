/**
 * BibTool Interface and BibToolContext
 *
 * Defines the unified tool contract for all BIB agents.
 * Tools are composed into agents via ToolRegistry, and adapted
 * to BaseAgent's AgentTool format via toBibAgentTool().
 *
 * @see spec Section 4 — API Design
 */

import type { DataContext } from '../context/types.js';

// =============================================================================
// Tool Parameter Types (compatible with agent-core ToolParameter)
// =============================================================================

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: ToolParameter;
}

export interface ToolParameterSchema {
  type: 'object';
  properties: Record<string, ToolParameter>;
  required?: string[];
}

// =============================================================================
// BibTool Interface
// =============================================================================

/**
 * A tool that can be registered in the BIB agent framework.
 *
 * Three tiers:
 * - 'core': Universal shared tools (business data, brand, sanitize)
 * - 'domain': BIB-specific per-agent tools (social posts, campaign drafts)
 * - 'extension': PM-stack capability ports (card system, panels)
 */
export interface BibTool {
  /** Unique name for the tool (e.g., 'get_business_info') */
  name: string;

  /** Human-readable description of what the tool does */
  description: string;

  /** JSON Schema for tool parameters */
  parameters: ToolParameterSchema;

  /** Tool tier for registry composition */
  tier: 'core' | 'domain' | 'extension';

  /** Execute the tool with the given arguments and context */
  execute(args: Record<string, unknown>, ctx: BibToolContext): Promise<unknown>;
}

// =============================================================================
// BibToolContext Interface
// =============================================================================

/**
 * Context provided to BibTool.execute().
 *
 * Business data tools read from dataContext (pre-loaded, no DB queries).
 * Brand tools may use prisma for DB lookups.
 */
export interface BibToolContext {
  /** Pre-loaded business data manifest */
  dataContext: DataContext;

  /** Current tenant identifier */
  tenantId: string;

  /** Prisma client for DB access (optional, used by brand tools) */
  prisma?: unknown;

  /** Agent-specific state (e.g., social state, campaign state) */
  agentState?: Record<string, unknown>;

  /** Operating mode: dashboard (authenticated) or public (anonymous) */
  mode: 'dashboard' | 'public';
}
