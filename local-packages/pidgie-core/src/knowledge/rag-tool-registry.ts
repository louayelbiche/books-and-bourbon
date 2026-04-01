import type { RagToolDefinition } from '../types/index.js';

/**
 * Tool registration and execution for RAG domain-specific tools.
 * Manages custom tools that the agent can call during chat
 * (e.g. submit_document, classify_document, update_contact).
 */
export class RagToolRegistry {
  private tools = new Map<string, RagToolDefinition>();

  /** Register a tool. */
  register(tool: RagToolDefinition): void {
    this.tools.set(tool.declaration.name, tool);
  }

  /** Get a tool by name. */
  get(name: string): RagToolDefinition | undefined {
    return this.tools.get(name);
  }

  /** Get all tool declarations, optionally excluding some by name. */
  getDeclarations(exclude?: string[]): Array<{ name: string; description: string; parameters?: Record<string, unknown> }> {
    const excludeSet = new Set(exclude || []);
    return Array.from(this.tools.values())
      .filter((t) => !excludeSet.has(t.declaration.name))
      .map((t) => t.declaration);
  }

  /** Execute a tool by name with given args. */
  async execute(name: string, args: Record<string, unknown>): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      return JSON.stringify({
        status: 'error',
        message: `Unknown tool: ${name}`,
      });
    }
    try {
      return await tool.handler(args);
    } catch (err) {
      return JSON.stringify({
        status: 'error',
        message: `Tool error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }
  }

  /** Number of registered tools. */
  get count(): number {
    return this.tools.size;
  }
}
