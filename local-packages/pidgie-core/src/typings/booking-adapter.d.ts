/**
 * Type stub for @runwell/booking-adapter.
 *
 * This package is an optional workspace dependency that may not be installed
 * in every consumer. The stub lets the DTS generator resolve the module
 * without requiring the actual package in node_modules.
 */
declare module '@runwell/booking-adapter' {
  import type { AgentTool } from '@runwell/agent-core';

  export interface BookingToolConfig {
    adapter: unknown;
    tenantId: string;
    sessionId?: string;
    businessName?: string;
    source?: string;
  }

  export function createCheckAvailabilityAgentTool(config: BookingToolConfig): AgentTool;
  export function createBookingAgentTool(config: BookingToolConfig): AgentTool;
}
