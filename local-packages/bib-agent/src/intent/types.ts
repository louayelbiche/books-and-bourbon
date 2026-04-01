/**
 * Intent Classification Types
 *
 * Deterministic intent detection for chatbot action dispatch.
 * The LLM handles conversation; this framework handles actions.
 */

export type IntentType =
  | 'none'
  | 'help'
  | 'interest'
  | 'order'
  | 'booking'
  | 'confirmation'
  | 'cancellation';

export interface ExtractedData {
  name?: string;
  email?: string;
  phone?: string;
  products?: { name: string; quantity?: number }[];
  date?: string;
  time?: string;
  question?: string;
  interest?: string;
}

export interface ClassifiedIntent {
  type: IntentType;
  confidence: number; // 0-1
  extractedData: ExtractedData;
  signals: string[]; // Which patterns/keywords triggered this classification
}

export type ActionToolName = 'submit_request' | 'capture_lead' | 'place_order' | 'create_booking';

export interface PendingAction {
  type: 'help' | 'interest' | 'order' | 'booking';
  tool: ActionToolName;
  params: Record<string, unknown>;
  missingParams: string[];
  createdAt: Date;
  confirmedAt?: Date;
}

export interface ActionState {
  sessionId: string;
  tenantId: string;
  pendingAction: PendingAction | null;
  collectedData: ExtractedData;
  lastUpdated: Date;
}

export interface ActionResult {
  executed: boolean;
  tool?: string;
  result?: Record<string, unknown>;
  error?: string;
}

export interface ContextInjection {
  /** Prepended to user message or injected as system context */
  systemFragment: string;
  /** If true, the LLM should NOT be asked to call tools for this action */
  suppressToolCalling: boolean;
}
