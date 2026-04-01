/**
 * ToolRegistry — Three-tier tool composition
 *
 * Manages registration and retrieval of BibTools across three tiers:
 * - Core: Universal shared tools (business data, brand, sanitize)
 * - Domain: BIB-specific per-agent tools
 * - Extension: PM-stack capability ports
 *
 * The registry is a singleton to ensure consistent tool definitions
 * across all agent instances within the same process.
 *
 * @see spec Section 4 — ToolRegistry
 */

import type { BibTool } from './types.js';

// =============================================================================
// CoreToolName Type
// =============================================================================

/**
 * Names of all core tools that ship with @runwell/bib-agent.
 * Core tools are registered at import time and available to all agents.
 */
export type CoreToolName =
  | 'fetch_website'
  | 'analyze_brand'
  | 'get_brand_voice'
  | 'get_business_info'
  | 'get_business_hours'
  | 'get_services'
  | 'get_faqs'
  | 'get_products'
  | 'sanitize_content';

// =============================================================================
// Error Types
// =============================================================================

/**
 * Thrown when a tool is not found in the registry (ERR-02).
 */
export class ToolNotFoundError extends Error {
  public readonly toolName: string;

  constructor(toolName: string) {
    super(`Tool "${toolName}" not found in registry`);
    this.name = 'ToolNotFoundError';
    this.toolName = toolName;
  }
}

/**
 * Thrown when a tool with a duplicate name is registered.
 */
export class DuplicateToolError extends Error {
  public readonly toolName: string;

  constructor(toolName: string) {
    super(`Tool "${toolName}" is already registered`);
    this.name = 'DuplicateToolError';
    this.toolName = toolName;
  }
}

// =============================================================================
// ToolRegistry Class
// =============================================================================

/**
 * Registry for BibTool instances.
 *
 * Thread-safe for concurrent lookups — all state is in a single Map
 * and lookups are synchronous reads (no shared mutable state corruption).
 *
 * Usage:
 * ```typescript
 * const registry = ToolRegistry.getInstance();
 * registry.register(getBusinessInfoTool);
 * const tools = registry.getCoreTools(['get_business_info', 'get_services']);
 * ```
 */
export class ToolRegistry {
  private static instance: ToolRegistry | null = null;
  private tools: Map<string, BibTool> = new Map();

  private constructor() {}

  /**
   * Get the singleton ToolRegistry instance.
   */
  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  /**
   * Reset the singleton (for testing only).
   */
  static resetInstance(): void {
    ToolRegistry.instance = null;
  }

  /**
   * Register a BibTool in the registry.
   *
   * @throws DuplicateToolError if a tool with the same name is already registered
   */
  register(tool: BibTool): void {
    if (this.tools.has(tool.name)) {
      throw new DuplicateToolError(tool.name);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Register multiple BibTools at once.
   *
   * @throws DuplicateToolError if any tool name is already registered
   */
  registerAll(tools: BibTool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Get a single tool by name.
   *
   * @throws ToolNotFoundError if the tool is not registered (ERR-02)
   */
  get(name: string): BibTool {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new ToolNotFoundError(name);
    }
    return tool;
  }

  /**
   * Get multiple core tools by name.
   * Convenience method that validates all names are CoreToolName.
   *
   * @throws ToolNotFoundError if any tool is not registered
   */
  getCoreTools(names: CoreToolName[]): BibTool[] {
    return names.map((name) => this.get(name));
  }

  /**
   * Get all registered tools of a specific tier.
   */
  getByTier(tier: 'core' | 'domain' | 'extension'): BibTool[] {
    return Array.from(this.tools.values()).filter((t) => t.tier === tier);
  }

  /**
   * Check if a tool is registered.
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all registered tool names.
   */
  getRegisteredNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get the total number of registered tools.
   */
  get size(): number {
    return this.tools.size;
  }
}
