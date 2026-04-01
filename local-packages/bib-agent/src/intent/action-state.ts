/**
 * Action State Machine
 *
 * Per-session state tracking for pending actions.
 * Manages the lifecycle: detected -> collecting params -> confirmed -> executed.
 *
 * In-memory Map keyed by sessionId. Sessions expire after 30 minutes.
 */

import type { ActionState, PendingAction, ClassifiedIntent, ExtractedData, ActionToolName } from './types.js';

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

/** Map of tool names for each intent type */
const INTENT_TO_TOOL: Record<string, ActionToolName> = {
  help: 'submit_request',
  interest: 'capture_lead',
  order: 'place_order',
  booking: 'create_booking',
};

/** Required params per action type */
const REQUIRED_PARAMS: Record<string, string[]> = {
  help: ['question'],
  interest: ['interest'],
  order: ['customer_name', 'items'],
  booking: ['visitor_name', 'date'],
};

/** Params that are "nice to have" (prompt user but don't block) */
const DESIRED_PARAMS: Record<string, string[]> = {
  help: ['name', 'email'],
  interest: ['name', 'email_or_phone'],
  order: ['email_or_phone'],
  booking: ['email_or_phone'],
};

export class ActionStateManager {
  private sessions = new Map<string, ActionState>();

  /**
   * Get or create session state.
   */
  getState(sessionId: string, tenantId: string): ActionState {
    this.cleanup();
    let state = this.sessions.get(sessionId);
    if (!state) {
      state = {
        sessionId,
        tenantId,
        pendingAction: null,
        collectedData: {},
        lastUpdated: new Date(),
      };
      this.sessions.set(sessionId, state);
    }
    state.lastUpdated = new Date();
    return state;
  }

  /**
   * Process a classified intent and update state.
   * Returns the updated state with any changes to pendingAction.
   */
  processIntent(state: ActionState, intent: ClassifiedIntent): ActionState {
    // Merge extracted data into collected data
    this.mergeExtractedData(state, intent.extractedData);

    switch (intent.type) {
      case 'confirmation':
        if (state.pendingAction && !state.pendingAction.confirmedAt) {
          // Fill any remaining params from collected data
          this.fillParamsFromCollected(state);
          state.pendingAction.confirmedAt = new Date();
        } else if (!state.pendingAction && intent.signals.includes('history_context')) {
          // Stateless mode: no pending action but confirmation detected via history.
          // Create a help action from extracted data and confirm immediately.
          const question = intent.extractedData.question || 'Follow-up request from conversation';
          state.pendingAction = {
            type: 'help',
            tool: 'submit_request',
            params: {
              question,
              visitor_name: intent.extractedData.name || state.collectedData.name,
              email: intent.extractedData.email || state.collectedData.email,
              customer_email: intent.extractedData.email || state.collectedData.email,
              phone: intent.extractedData.phone || state.collectedData.phone,
            },
            missingParams: [],
            createdAt: new Date(),
            confirmedAt: new Date(),
          };
        }
        break;

      case 'cancellation':
        state.pendingAction = null;
        break;

      case 'help':
      case 'interest':
      case 'order':
      case 'booking':
        // Create or update pending action
        state.pendingAction = this.createPendingAction(intent, state);
        break;

      case 'none':
        // If there's a pending action with missing params, check if this message provides them
        if (state.pendingAction && state.pendingAction.missingParams.length > 0) {
          this.fillParamsFromCollected(state);
          // Recalculate missing params
          state.pendingAction.missingParams = this.getMissingParams(
            state.pendingAction.type,
            state.pendingAction.params
          );
        }
        break;
    }

    return state;
  }

  /**
   * Check if the pending action has implicit confirmation.
   * Contact info + buying intent in the same message = implicit confirm for lead capture.
   */
  checkImplicitConfirmation(state: ActionState, intent: ClassifiedIntent): boolean {
    if (!state.pendingAction || state.pendingAction.confirmedAt) return false;

    // Interest + contact info = implicit confirmation
    if (state.pendingAction.type === 'interest') {
      const hasContact = intent.extractedData.email || intent.extractedData.phone
        || state.collectedData.email || state.collectedData.phone;
      if (hasContact) {
        this.fillParamsFromCollected(state);
        state.pendingAction.confirmedAt = new Date();
        return true;
      }
    }

    return false;
  }

  /**
   * Clear the pending action after execution.
   */
  clearPendingAction(state: ActionState): void {
    state.pendingAction = null;
  }

  // ─── Internal ──────────────────────────────────────────────────

  private createPendingAction(intent: ClassifiedIntent, state: ActionState): PendingAction {
    const type = intent.type as 'help' | 'interest' | 'order' | 'booking';
    const tool = INTENT_TO_TOOL[type];
    const params = this.buildInitialParams(type, intent.extractedData, state.collectedData);
    const missingParams = this.getMissingParams(type, params);

    return {
      type,
      tool,
      params,
      missingParams,
      createdAt: new Date(),
    };
  }

  private buildInitialParams(
    type: string,
    extracted: ExtractedData,
    collected: ExtractedData
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    const data = { ...collected, ...extracted }; // extracted takes priority

    // Common params
    if (data.name) params.visitor_name = data.name;
    if (data.name) params.customer_name = data.name;
    if (data.email) params.email = data.email;
    if (data.email) params.customer_email = data.email;
    if (data.phone) params.phone = data.phone;
    if (data.phone) params.customer_phone = data.phone;

    // Type-specific params
    switch (type) {
      case 'help':
        params.question = data.question || data.interest || '';
        break;
      case 'interest':
        params.interest = data.interest || '';
        if (data.products && data.products.length > 0) {
          params.interest = data.products.map(p =>
            p.quantity ? `${p.quantity} ${p.name}` : p.name
          ).join(', ');
        }
        break;
      case 'order':
        if (data.products && data.products.length > 0) {
          params.items = data.products.map(p => ({
            product_name: p.name,
            quantity: p.quantity || 1,
          }));
        }
        break;
      case 'booking':
        if (data.date) params.date = data.date;
        if (data.time) params.time = data.time;
        break;
    }

    return params;
  }

  private getMissingParams(type: string, params: Record<string, unknown>): string[] {
    const required = REQUIRED_PARAMS[type] || [];
    const missing: string[] = [];

    for (const param of required) {
      if (param === 'email_or_phone') {
        if (!params.email && !params.phone && !params.customer_email && !params.customer_phone) {
          missing.push('email or phone');
        }
      } else if (param === 'items') {
        if (!params.items || (Array.isArray(params.items) && params.items.length === 0)) {
          missing.push('products and quantities');
        }
      } else if (!params[param] && !params[`customer_${param}`] && !params[`visitor_${param}`]) {
        missing.push(param);
      }
    }

    return missing;
  }

  private fillParamsFromCollected(state: ActionState): void {
    if (!state.pendingAction) return;
    const data = state.collectedData;
    const params = state.pendingAction.params;

    if (data.name && !params.visitor_name) params.visitor_name = data.name;
    if (data.name && !params.customer_name) params.customer_name = data.name;
    if (data.email && !params.email) params.email = data.email;
    if (data.email && !params.customer_email) params.customer_email = data.email;
    if (data.phone && !params.phone) params.phone = data.phone;
    if (data.phone && !params.customer_phone) params.customer_phone = data.phone;
  }

  private mergeExtractedData(state: ActionState, extracted: ExtractedData): void {
    if (extracted.name) state.collectedData.name = extracted.name;
    if (extracted.email) state.collectedData.email = extracted.email;
    if (extracted.phone) state.collectedData.phone = extracted.phone;
    if (extracted.products) {
      state.collectedData.products = [
        ...(state.collectedData.products || []),
        ...extracted.products,
      ];
    }
    if (extracted.date) state.collectedData.date = extracted.date;
    if (extracted.time) state.collectedData.time = extracted.time;
    if (extracted.question) state.collectedData.question = extracted.question;
    if (extracted.interest) state.collectedData.interest = extracted.interest;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, state] of this.sessions) {
      if (now - state.lastUpdated.getTime() > SESSION_TTL_MS) {
        this.sessions.delete(key);
      }
    }
  }
}
