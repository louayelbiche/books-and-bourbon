/**
 * Action Dispatcher
 *
 * Executes confirmed actions by calling tools directly.
 * Bypasses the LLM entirely for tool execution.
 * Generates context injections for the LLM to acknowledge.
 */

import type { ActionState, ActionResult, ContextInjection } from './types.js';

type ToolExecutor = (toolName: string, params: Record<string, unknown>) => Promise<Record<string, unknown>>;

export class ActionDispatcher {
  constructor(private executeToolFn: ToolExecutor) {}

  /**
   * Check if the current state requires action dispatch.
   */
  shouldDispatch(state: ActionState): boolean {
    return !!(state.pendingAction?.confirmedAt);
  }

  /**
   * Execute the pending confirmed action.
   * Returns the result and clears the pending action.
   */
  async dispatch(state: ActionState): Promise<ActionResult> {
    const action = state.pendingAction;
    if (!action || !action.confirmedAt) {
      return { executed: false };
    }

    try {
      const result = await this.executeToolFn(action.tool, action.params);
      state.pendingAction = null;
      return {
        executed: true,
        tool: action.tool,
        result: result as Record<string, unknown>,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[dispatcher] Tool ${action.tool} failed:`, errorMsg);
      state.pendingAction = null;
      return {
        executed: false,
        tool: action.tool,
        error: errorMsg,
      };
    }
  }

  /**
   * Generate context injection for the LLM based on current state.
   * This tells the LLM what happened or what to ask next.
   */
  buildContextInjection(state: ActionState, actionResult?: ActionResult): ContextInjection {
    // Action was just executed
    if (actionResult?.executed) {
      const resultSummary = this.summarizeResult(actionResult);
      return {
        systemFragment: `[ACTION COMPLETED] The ${actionResult.tool} tool was called successfully. Result: ${resultSummary}. Acknowledge this to the visitor in your response. Do NOT ask for additional confirmation; the action is done.`,
        suppressToolCalling: true,
      };
    }

    // Action failed
    if (actionResult && !actionResult.executed && actionResult.error) {
      return {
        systemFragment: `[ACTION FAILED] The ${actionResult.tool} tool failed: ${actionResult.error}. Apologize to the visitor and offer to try again or suggest contacting the business directly.`,
        suppressToolCalling: true,
      };
    }

    const action = state.pendingAction;
    if (!action) {
      return { systemFragment: '', suppressToolCalling: false };
    }

    // Pending action needs more params
    if (action.missingParams.length > 0) {
      const missing = action.missingParams.join(', ');
      const actionDesc = this.describeAction(action.type);
      return {
        systemFragment: `[ACTION PENDING] The visitor wants to ${actionDesc}. Ask them for the following information: ${missing}. Be conversational; don't list these as a form.`,
        suppressToolCalling: true,
      };
    }

    // Pending action has all params, needs confirmation
    if (!action.confirmedAt) {
      const summary = this.summarizeParams(action);
      const actionDesc = this.describeAction(action.type);
      return {
        systemFragment: `[CONFIRM ACTION] You have all the information needed to ${actionDesc}. Summarize what you will do: ${summary}. Ask the visitor to confirm with a simple yes/no. Do NOT execute the action yet; wait for their confirmation.`,
        suppressToolCalling: true,
      };
    }

    return { systemFragment: '', suppressToolCalling: false };
  }

  // ─── Internal ──────────────────────────────────────────────────

  private summarizeResult(result: ActionResult): string {
    if (!result.result) return 'completed';
    const r = result.result;

    switch (result.tool) {
      case 'submit_request':
        return `Request submitted (ID: ${r.request_id || 'N/A'}). The team will follow up.`;
      case 'capture_lead':
        return `Lead recorded (ID: ${r.request_id || 'N/A'}). The team will follow up.`;
      case 'place_order':
        return `Order reserved (number: ${r.orderNumber || 'N/A'}). Status: ${r.status || 'pending'}.`;
      case 'create_booking':
        return `Booking created (ID: ${r.bookingId || r.booking_id || 'N/A'}).`;
      default:
        return JSON.stringify(r).slice(0, 200);
    }
  }

  private describeAction(type: string): string {
    switch (type) {
      case 'help': return 'submit a request to the team for follow-up';
      case 'interest': return 'record their interest so the team can follow up';
      case 'order': return 'reserve products for them';
      case 'booking': return 'book an appointment';
      default: return 'take an action';
    }
  }

  private summarizeParams(action: { type: string; params: Record<string, unknown> }): string {
    const p = action.params;
    switch (action.type) {
      case 'help':
        return `Submit request about "${p.question || 'their inquiry'}" for ${p.visitor_name || 'the visitor'} (${p.email || p.phone || 'no contact yet'})`;
      case 'interest':
        return `Record interest in "${p.interest || 'products'}" for ${p.visitor_name || 'the visitor'} (${p.email || p.phone || 'no contact yet'})`;
      case 'order': {
        const items = Array.isArray(p.items) ? p.items : [];
        const itemStr = items.map((i: any) => `${i.quantity || 1}x ${i.product_name || i.name || '?'}`).join(', ');
        return `Reserve ${itemStr} for ${p.customer_name || 'the customer'}`;
      }
      case 'booking':
        return `Book appointment on ${p.date || '?'} at ${p.time || '?'} for ${p.visitor_name || 'the visitor'}`;
      default:
        return JSON.stringify(p).slice(0, 150);
    }
  }
}
