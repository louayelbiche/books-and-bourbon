/**
 * Type stub for @runwell/request-escalation.
 *
 * This package is an optional workspace dependency that may not be installed
 * in every consumer. The stub lets the DTS generator resolve the module
 * without requiring the actual package in node_modules.
 */
declare module '@runwell/request-escalation' {
  import type { AgentTool } from '@runwell/agent-core';

  export interface EscalationToolConfig {
    store: RequestStore;
    tenantId: string;
    sessionId?: string;
    businessName?: string;
    source?: string;
    notify?: unknown;
  }

  export interface RequestStore {
    create(input: unknown): Promise<unknown>;
    getById(id: string): Promise<unknown>;
    list(options: unknown): Promise<unknown[]>;
    updateStatus(id: string, status: string, note?: string): Promise<unknown>;
  }

  export class PrismaRequestStore implements RequestStore {
    constructor(prisma: unknown);
    create(input: unknown): Promise<unknown>;
    getById(id: string): Promise<unknown>;
    list(options: unknown): Promise<unknown[]>;
    updateStatus(id: string, status: string, note?: string): Promise<unknown>;
  }

  export function createEscalationAgentTool(config: EscalationToolConfig): AgentTool;
}
